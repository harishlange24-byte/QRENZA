import mongoose from "mongoose";
import SupplyOrder from "../models/supplyOrder.model.js";
import {resolveMerchant, findOwnedStore} from "../utils/access.js";
import {SUPPLY_CATALOG, SUPPLY_SHIPPING_FLAT, findSupply} from "../config/supplies.js";

const supplyOrderView = (order)=>{
    return {
        id:order._id,
        items:order.items.map((line)=>({
            productId:line.productId,
            name:line.name,
            price:line.price,
            quantity:line.quantity
        })),
        subtotal:order.subtotal,
        shipping:order.shipping,
        total:order.total,
        contactName:order.contactName,
        contactPhone:order.contactPhone,
        deliveryAddress:order.deliveryAddress,
        note:order.note,
        status:order.status,
        createdAt:order.createdAt,
        cancelledAt:order.cancelledAt
    };
}

// The catalogue is static, so it ships with the shipping charge the panel shows.
const listSupplyCatalog = async(req,res)=>{
    try{
        return res.status(200).json({
            success:true,
            message:"Supply catalogue",
            data:{
                products:SUPPLY_CATALOG,
                shipping:SUPPLY_SHIPPING_FLAT
            }
        })
    }catch(error){
        console.error("listSupplyCatalog error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to load the supply catalogue"
        })
    }
}

// A merchant orders the printed QR standee and friends from the panel.
const createSupplyOrder = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(403).json({
                success:false,
                code:"MERCHANT_NOT_FOUND",
                message:"Only a merchant account can order supplies"
            })
        }

        const {
            items,
            contactName,
            contactPhone,
            deliveryAddress,
            note,
            storeId
        } = req.body;

        if(!Array.isArray(items) || items.length === 0){
            return res.status(400).json({
                success:false,
                message:"Add at least one supply item"
            })
        }

        const lines = [];

        for(const line of items){
            const product = findSupply(line?.productId);

            if(!product){
                continue;
            }

            const quantity = Math.floor(Number(line?.quantity || 1));

            lines.push({
                productId:product.id,
                name:product.name,
                price:product.price,
                quantity:Math.min(Math.max(quantity,1),50)
            });
        }

        if(lines.length === 0){
            return res.status(400).json({
                success:false,
                message:"None of these supplies exist in the catalogue"
            })
        }

        if(!contactName?.trim() || !contactPhone?.trim() || !deliveryAddress?.trim()){
            return res.status(400).json({
                success:false,
                message:"Name, phone and delivery address are required"
            })
        }

        // A store link is optional, and it must belong to this merchant.
        let store = null;

        if(storeId){
            store = await findOwnedStore(merchant,storeId);
        }

        const subtotal = lines.reduce((sum,line)=>sum + line.price * line.quantity,0);

        const order = await SupplyOrder.create({
            merchant:merchant._id,
            store:store?._id || null,
            items:lines,
            subtotal,
            shipping:SUPPLY_SHIPPING_FLAT,
            total:subtotal + SUPPLY_SHIPPING_FLAT,
            contactName:contactName.trim(),
            contactPhone:contactPhone.trim(),
            deliveryAddress:deliveryAddress.trim(),
            note:String(note || "").trim()
        });

        return res.status(201).json({
            success:true,
            message:"Supply order placed successfully",
            data:{order:supplyOrderView(order)}
        })
    }catch(error){
        console.error("createSupplyOrder error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to place the supply order"
        })
    }
}

const listSupplyOrders = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(403).json({
                success:false,
                code:"MERCHANT_NOT_FOUND",
                message:"Only a merchant account can view supplies"
            })
        }

        const orders = await SupplyOrder.find({merchant:merchant._id})
            .sort({createdAt:-1})
            .limit(50);

        return res.status(200).json({
            success:true,
            message:"Supply orders fetched successfully",
            data:{orders:orders.map(supplyOrderView)}
        })
    }catch(error){
        console.error("listSupplyOrders error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch supply orders"
        })
    }
}

const cancelSupplyOrder = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(403).json({
                success:false,
                code:"MERCHANT_NOT_FOUND",
                message:"Only a merchant account can cancel supplies"
            })
        }

        if(!mongoose.isValidObjectId(req.params.orderId)){
            return res.status(400).json({
                success:false,
                message:"Invalid supply order id"
            })
        }

        const order = await SupplyOrder.findOne({
            _id:req.params.orderId,
            merchant:merchant._id
        });

        if(!order){
            return res.status(404).json({
                success:false,
                message:"Supply order not found"
            })
        }

        if(order.status !== "REQUESTED"){
            return res.status(400).json({
                success:false,
                code:"SUPPLY_LOCKED",
                message:`This supply order is already ${order.status.toLowerCase()}`
            })
        }

        order.status = "CANCELLED";
        order.cancelledAt = new Date();
        await order.save();

        return res.status(200).json({
            success:true,
            message:"Supply order cancelled",
            data:{order:supplyOrderView(order)}
        })
    }catch(error){
        console.error("cancelSupplyOrder error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to cancel the supply order"
        })
    }
}

export {
    listSupplyCatalog,
    createSupplyOrder,
    listSupplyOrders,
    cancelSupplyOrder
};
