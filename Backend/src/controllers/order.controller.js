import mongoose from "mongoose";
import Order from "../models/order.model.js";
import GiftCard from "../models/giftCard.model.js";
import Menu from "../models/menu.model.js";
import MenuItem from "../models/menuItem.model.js";
import {resolveMerchant, findOwnedStore, findPublicStore} from "../utils/access.js";
import {resolveAccess, hasFeature} from "../services/entitlement.service.js";
import {resolveGiftCard} from "./giftCard.controller.js";
import {emitOrderUpdate} from "../realtime.js";

const ACTIVE_STATUSES = ["PLACED","ACCEPTED","PREPARING","READY"];

const ORDER_STATUSES = [
    "PLACED",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "SERVED",
    "CANCELLED"
];

// The desk may only move an order forward, never backwards.
const TRANSITIONS = {
    PLACED:["ACCEPTED","CANCELLED"],
    ACCEPTED:["PREPARING","CANCELLED"],
    PREPARING:["READY","CANCELLED"],
    READY:["SERVED"],
    SERVED:["SERVED"],
    CANCELLED:["CANCELLED"]
};

// Minutes the customer still has to wait, so the screen can count down without
// trusting the browser clock.
const minutesLeft = (order)=>{
    if(["READY","SERVED","CANCELLED"].includes(order.status)){
        return 0;
    }

    const readyAt = new Date(order.estimatedReadyAt).getTime();

    return Math.max(0,Math.ceil((readyAt - Date.now()) / 60000));
}

const orderView = (order)=>{
    return {
        id:order._id,
        customerName:order.customerName,
        customerPhone:order.customerPhone,
        tableNumber:order.tableNumber,
        items:order.items.map((line)=>({
            name:line.name,
            price:line.price,
            quantity:line.quantity,
            isFree:line.isFree
        })),
        subtotal:order.subtotal,
        discount:order.discount,
        total:order.total,
        giftCardCode:order.giftCardCode,
        note:order.note,
        status:order.status,
        preparationMinutes:order.preparationMinutes,
        estimatedReadyAt:order.estimatedReadyAt,
        minutesLeft:minutesLeft(order),
        createdAt:order.createdAt,
        cancelledAt:order.cancelledAt,
        cancelReason:order.cancelReason
    };
}

// Table ordering is a paid feature, so the public side checks the merchant's
// plan too instead of trusting a hidden button.
const isOrderingEnabled = async (merchantId)=>{
    const access = await resolveAccess(merchantId);
    return hasFeature(access,"ONLINE_ORDERING");
}

// Guests order with a phone, logged in customers are matched by their account.
const callerFilter = (req,base)=>{
    const user = req.user?._id || null;
    const phone = String(req.body?.phone || req.query?.phone || "").trim();

    if(user){
        return {...base,user};
    }

    if(phone){
        return {...base,customerPhone:phone};
    }

    return null;
}

const placeOrder = async(req,res)=>{
    try{
        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            })
        }

        if(!(await isOrderingEnabled(store.merchant))){
            return res.status(403).json({
                success:false,
                code:"ORDERING_DISABLED",
                message:"This store has not switched on table ordering yet"
            })
        }

        const {
            items,
            customerName,
            customerPhone,
            tableNumber,
            note,
            giftCardCode
        } = req.body;

        if(!Array.isArray(items) || items.length === 0){
            return res.status(400).json({
                success:false,
                message:"Add at least one item to your order"
            })
        }

        if(!customerName?.trim() || !customerPhone?.trim()){
            return res.status(400).json({
                success:false,
                message:"Name and phone are required to place the order"
            })
        }

        const phone = String(customerPhone).trim();

        if(!/^[6-9]\d{9}$/.test(phone)){
            return res.status(400).json({
                success:false,
                message:"Enter a valid 10-digit phone number"
            })
        }

        // Merge duplicate lines and cap the quantity, the cart lives in the
        // browser so it can never be trusted as is.
        const wanted = new Map();

        for(const line of items){
            const id = String(line?.itemId || line?._id || "").trim();
            const quantity = Math.floor(Number(line?.quantity || 1));

            if(!mongoose.isValidObjectId(id) || !Number.isFinite(quantity) || quantity < 1){
                continue;
            }

            wanted.set(id,(wanted.get(id) || 0) + Math.min(quantity,20));
        }

        if(wanted.size === 0){
            return res.status(400).json({
                success:false,
                message:"Add at least one item to your order"
            })
        }

        const menu = await Menu.findOne({store:store._id});

        if(!menu){
            return res.status(400).json({
                success:false,
                message:"This store has not published a menu yet"
            })
        }

        const menuItems = await MenuItem.find({
            _id:{$in:[...wanted.keys()]},
            menu:menu._id,
            store:store._id
        });

        if(menuItems.length === 0){
            return res.status(400).json({
                success:false,
                message:"None of these items belong to this store"
            })
        }

        const soldOut = menuItems.find((item)=>item.isAvailable === false);

        if(soldOut){
            return res.status(400).json({
                success:false,
                message:`${soldOut.name} is out of stock right now`
            })
        }

        // Prices always come from the menu, never from the browser.
        const orderItems = menuItems.map((item)=>({
            item:item._id,
            name:item.name,
            price:item.price,
            quantity:wanted.get(String(item._id)),
            isFree:false
        }));

        const subtotal = orderItems.reduce((sum,line)=>sum + line.price * line.quantity,0);

        let discount = 0;
        let card = null;
        let appliedCode = "";

        if(giftCardCode){
            const resolved = await resolveGiftCard(store._id,giftCardCode,subtotal);

            if(resolved.error){
                return res.status(400).json({
                    success:false,
                    code:"GIFT_CARD_INVALID",
                    message:resolved.error
                })
            }

            card = resolved.card;
            appliedCode = card.code;

            if(card.type === "FREE_ITEM"){
                const wantedName = String(resolved.freeItemName || card.title).toLowerCase();
                const line = orderItems.find((entry)=>entry.name.toLowerCase() === wantedName)
                    || orderItems.find((entry)=>entry.name.toLowerCase().includes(wantedName));

                if(!line){
                    return res.status(400).json({
                        success:false,
                        code:"GIFT_CARD_ITEM_MISSING",
                        message:`Add ${resolved.freeItemName || card.title} to your order to use this gift card`
                    })
                }

                line.isFree = true;
                line.price = 0;
                discount = menuItems.find((item)=>String(item._id) === String(line.item))?.price || 0;
            }else{
                discount = resolved.discount;
            }
        }

        const total = Math.max(0,subtotal - discount);

        const prepTimes = orderItems.map((line)=>{
            const menuItem = menuItems.find((item)=>String(item._id) === String(line.item));
            return Number(menuItem?.preparationTimeMinutes) || 10;
        });

        const preparationMinutes = Math.max(5,...prepTimes);
        const estimatedReadyAt = new Date(Date.now() + preparationMinutes * 60000);

        const order = await Order.create({
            store:store._id,
            user:req.user?._id || null,
            customerName:customerName.trim(),
            customerPhone:phone,
            tableNumber:String(tableNumber || "").trim(),
            items:orderItems,
            subtotal,
            discount,
            total,
            giftCard:card?._id || null,
            giftCardCode:appliedCode,
            note:String(note || "").trim(),
            preparationMinutes,
            estimatedReadyAt
        });

        if(card){
            await GiftCard.updateOne(
                {_id:card._id},
                {$set:{status:"USED",usedAt:new Date(),usedOrder:order._id}}
            );
        }

        emitOrderUpdate(store._id,store.publicCode);

        return res.status(201).json({
            success:true,
            message:"Order placed successfully",
            data:{order:orderView(order)}
        })
    }catch(error){
        console.error("placeOrder error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to place the order"
        })
    }
}

const getMyOrders = async(req,res)=>{
    try{
        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            })
        }

        const filter = callerFilter(req,{store:store._id});

        if(!filter){
            return res.status(200).json({
                success:true,
                message:"No orders to show",
                data:{orders:[]}
            })
        }

        const orders = await Order.find(filter).sort({createdAt:-1}).limit(20);

        return res.status(200).json({
            success:true,
            message:"Orders fetched successfully",
            data:{orders:orders.map(orderView)}
        })
    }catch(error){
        console.error("getMyOrders error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch your orders"
        })
    }
}

const cancelOrder = async(req,res)=>{
    try{
        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            })
        }

        if(!mongoose.isValidObjectId(req.params.orderId)){
            return res.status(400).json({
                success:false,
                message:"Invalid order id"
            })
        }

        const filter = callerFilter(req,{_id:req.params.orderId,store:store._id});

        if(!filter){
            return res.status(400).json({
                success:false,
                message:"We could not identify your order, try again from the same device"
            })
        }

        const order = await Order.findOne(filter);

        if(!order){
            return res.status(404).json({
                success:false,
                message:"Order not found"
            })
        }

        if(!["PLACED","ACCEPTED"].includes(order.status)){
            return res.status(400).json({
                success:false,
                code:"ORDER_LOCKED",
                message:"The kitchen has already started this order, please ask the counter"
            })
        }

        order.status = "CANCELLED";
        order.cancelledAt = new Date();
        order.cancelReason = String(req.body?.reason || "Cancelled by customer").trim();
        await order.save();

        // Give the gift card back, it must not burn on a cancelled order.
        if(order.giftCard){
            await GiftCard.updateOne(
                {_id:order.giftCard,status:"USED"},
                {$set:{status:"ACTIVE",usedAt:null,usedOrder:null}}
            );
        }

        emitOrderUpdate(store._id,store.publicCode);

        return res.status(200).json({
            success:true,
            message:"Order cancelled",
            data:{order:orderView(order)}
        })
    }catch(error){
        console.error("cancelOrder error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to cancel the order"
        })
    }
}

const listStoreOrders = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const status = String(req.query?.status || "").trim().toUpperCase();
        const filter = {store:store._id};

        // The desk opens on the live queue of orders by default.
        if(status === "ACTIVE"){
            filter.status = {$in:ACTIVE_STATUSES};
        }else if(ORDER_STATUSES.includes(status)){
            filter.status = status;
        }

        const orders = await Order.find(filter).sort({createdAt:-1}).limit(50);

        return res.status(200).json({
            success:true,
            message:"Orders fetched successfully",
            data:{
                orders:orders.map(orderView),
                counts:{
                    placed:await Order.countDocuments({store:store._id,status:"PLACED"}),
                    preparing:await Order.countDocuments({store:store._id,status:{$in:["ACCEPTED","PREPARING"]}}),
                    ready:await Order.countDocuments({store:store._id,status:"READY"})
                }
            }
        })
    }catch(error){
        console.error("listStoreOrders error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch orders"
        })
    }
}

const updateOrderStatus = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        if(!mongoose.isValidObjectId(req.params.orderId)){
            return res.status(400).json({
                success:false,
                message:"Invalid order id"
            })
        }

        const next = String(req.body?.status || "").trim().toUpperCase();

        if(!ORDER_STATUSES.includes(next)){
            return res.status(400).json({
                success:false,
                message:"Unknown order status"
            })
        }

        const order = await Order.findOne({
            _id:req.params.orderId,
            store:store._id
        });

        if(!order){
            return res.status(404).json({
                success:false,
                message:"Order not found"
            })
        }

        const allowed = TRANSITIONS[order.status] || [];

        if(!allowed.includes(next)){
            return res.status(400).json({
                success:false,
                message:`This order is already ${order.status}`
            })
        }

        if(next === "ACCEPTED"){
            order.acceptedAt = new Date();
        }

        if(next === "READY"){
            order.readyAt = new Date();
        }

        if(next === "SERVED"){
            order.servedAt = new Date();
        }

        if(next === "CANCELLED"){
            order.cancelledAt = new Date();
            order.cancelReason = String(req.body?.reason || "Rejected by the store").trim();

            if(order.giftCard){
                await GiftCard.updateOne(
                    {_id:order.giftCard,status:"USED"},
                    {$set:{status:"ACTIVE",usedAt:null,usedOrder:null}}
                );
            }
        }

        order.status = next;
        await order.save();

        emitOrderUpdate(store._id,store.publicCode);

        return res.status(200).json({
            success:true,
            message:`Order marked ${next}`,
            data:{order:orderView(order)}
        })
    }catch(error){
        console.error("updateOrderStatus error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to update the order"
        })
    }
}

export {
    placeOrder,
    getMyOrders,
    cancelOrder,
    listStoreOrders,
    updateOrderStatus,
    isOrderingEnabled
};
