import mongoose from "mongoose";
import menuModel from "../models/menu.model.js";
import menuCategoryModel from "../models/menuCategory.model.js";
import menuItemModel from "../models/menuItem.model.js";
import { resolveMerchant, findOwnedStore, findPublicStore } from "../utils/access.js";
import { resolveAccess, hasFeature } from "../services/entitlement.service.js";


// A store owns exactly one menu. Create it lazily and let the unique index
// guard the race, then re-read when a concurrent request won.
const findOrCreateMenu = async (storeId)=>{
    const existing = await menuModel.findOne({store:storeId});

    if(existing){
        return existing;
    }

    try{
        return await menuModel.create({
            store:storeId,
            name:"Main Menu"
        });
    }catch(error){
        if(error.code === 11000){
            return menuModel.findOne({store:storeId});
        }
        throw error;
    }
}

const shapeItem = (item)=>{
    return {
        _id:item._id,
        name:item.name,
        description:item.description,
        price:item.price,
        image:item.image,
        isVeg:item.isVeg,
        isAvailable:item.isAvailable,
        preparationTimeMinutes:item.preparationTimeMinutes,
        sortOrder:item.sortOrder,
        categoryId:item.category
    };
}

const getPublicMenu = async(req,res)=>{
    try{
        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            })
        }

        const storeInfo = {
            publicCode:store.publicCode,
            name:store.name,
            slug:store.slug,
            // The add to cart buttons only appear when the merchant's plan
            // includes table ordering.
            orderingEnabled:hasFeature(await resolveAccess(store.merchant),"ONLINE_ORDERING")
        };

        const menu = await menuModel.findOne({store:store._id});

        if(!menu){
            return res.status(200).json({
                success:true,
                message:"Menu not available yet",
                data:{
                    store:storeInfo,
                    menu:{
                        name:"Main Menu",
                        description:"",
                        currency:"INR",
                        isPublished:false,
                        items:[]
                    },
                    categories:[]
                }
            })
        }

        const categories = await menuCategoryModel
            .find({menu:menu._id,isActive:{$ne:false}})
            .sort({sortOrder:1})
            .lean();

        const items = await menuItemModel
            .find({menu:menu._id,isAvailable:{$ne:false}})
            .sort({sortOrder:1})
            .lean();

        const shapedItems = items.map(shapeItem);

        return res.status(200).json({
            success:true,
            message:"Menu found",
            data:{
                store:storeInfo,
                menu:{
                    name:menu.name,
                    description:menu.description,
                    currency:menu.currency,
                    isPublished:menu.isPublished,
                    items:shapedItems
                },
                categories:categories.map((category)=>({
                    id:category._id,
                    name:category.name,
                    description:category.description,
                    items:shapedItems.filter((item)=>String(item.categoryId) === String(category._id))
                }))
            }
        })
    }catch(error){
        console.error("getPublicMenu error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch menu"
        })
    }
}

const getMerchantMenu = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const menu = await findOrCreateMenu(store._id);

        const categories = await menuCategoryModel
            .find({menu:menu._id})
            .sort({sortOrder:1})
            .lean();

        const items = await menuItemModel
            .find({menu:menu._id})
            .sort({sortOrder:1})
            .lean();

        const shapedItems = items.map(shapeItem);

        return res.status(200).json({
            success:true,
            message:"Menu fetched successfully",
            data:{
                store:{
                    id:store._id,
                    publicCode:store.publicCode,
                    name:store.name,
                    slug:store.slug
                },
                menu:{
                    id:menu._id,
                    name:menu.name,
                    description:menu.description,
                    currency:menu.currency,
                    isPublished:menu.isPublished,
                    items:shapedItems
                },
                categories:categories.map((category)=>({
                    id:category._id,
                    name:category.name,
                    description:category.description,
                    sortOrder:category.sortOrder,
                    isActive:category.isActive,
                    items:shapedItems.filter((item)=>String(item.categoryId) === String(category._id))
                }))
            }
        })
    }catch(error){
        console.error("getMerchantMenu error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch menu"
        })
    }
}

const createCategory = async(req,res)=>{
    try{
        const {name,description,sortOrder} = req.body;

        if(!name?.trim()){
            return res.status(400).json({
                success:false,
                message:"Category name is required"
            })
        }

        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const menu = await findOrCreateMenu(store._id);

        const category = await menuCategoryModel.create({
            menu:menu._id,
            store:store._id,
            name:name.trim(),
            description,
            sortOrder
        });

        return res.status(201).json({
            success:true,
            message:"Category created successfully",
            data:{
                category:{
                    id:category._id,
                    name:category.name,
                    description:category.description,
                    sortOrder:category.sortOrder,
                    isActive:category.isActive
                }
            }
        })
    }catch(error){
        console.error("createCategory error : ",error);

        if(error.code === 11000){
            return res.status(409).json({
                success:false,
                message:"Category already exists"
            })
        }

        return res.status(500).json({
            success:false,
            message:"Unable to create category"
        })
    }
}

const createItem = async(req,res)=>{
    try{
        const {
            categoryId,
            category,
            name,
            price,
            description,
            image,
            isVeg,
            isAvailable,
            preparationTimeMinutes,
            sortOrder
        } = req.body;

        // The admin form posts the category as "category"; accept both keys.
        const resolvedCategoryId = categoryId || category;

        if(!resolvedCategoryId){
            return res.status(400).json({
                success:false,
                message:"Category id is required"
            })
        }

        if(!mongoose.isValidObjectId(resolvedCategoryId)){
            return res.status(400).json({
                success:false,
                message:"Invalid category id"
            })
        }

        if(!name?.trim()){
            return res.status(400).json({
                success:false,
                message:"Item name is required"
            })
        }

        if(price === undefined || price === null || price === ""){
            return res.status(400).json({
                success:false,
                message:"Item price is required"
            })
        }

        const numericPrice = Number(price);

        if(!Number.isFinite(numericPrice) || numericPrice < 0){
            return res.status(400).json({
                success:false,
                message:"Item price must be a number greater than or equal to 0"
            })
        }

        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const menu = await findOrCreateMenu(store._id);

        const parentCategory = await menuCategoryModel.findOne({
            _id:resolvedCategoryId,
            menu:menu._id,
            store:store._id
        });

        if(!parentCategory){
            return res.status(404).json({
                success:false,
                message:"Category not found"
            })
        }

        const item = await menuItemModel.create({
            menu:menu._id,
            category:parentCategory._id,
            store:store._id,
            name:name.trim(),
            description,
            price:numericPrice,
            image,
            isVeg,
            isAvailable,
            preparationTimeMinutes,
            sortOrder
        });

        return res.status(201).json({
            success:true,
            message:"Item created successfully",
            data:{
                item:shapeItem(item)
            }
        })
    }catch(error){
        console.error("createItem error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to create item"
        })
    }
}

const updateItem = async(req,res)=>{
    try{
        const {itemId} = req.params;

        if(!mongoose.isValidObjectId(itemId)){
            return res.status(400).json({
                success:false,
                message:"Invalid item id"
            })
        }

        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const input = {...(req.body || {})};

        // The admin form posts the category as "category"; accept both keys.
        if(input.categoryId === undefined && input.category !== undefined){
            input.categoryId = input.category;
        }

        const allowedFields = [
            "name",
            "description",
            "price",
            "image",
            "isVeg",
            "isAvailable",
            "preparationTimeMinutes",
            "sortOrder",
            "categoryId"
        ];

        const updates = {};

        for(const field of allowedFields){
            if(input[field] === undefined){
                continue;
            }

            if(field === "categoryId"){
                if(!mongoose.isValidObjectId(input.categoryId)){
                    return res.status(400).json({
                        success:false,
                        message:"Invalid category id"
                    })
                }
                updates.category = input.categoryId;
                continue;
            }

            if(field === "price"){
                const numericPrice = Number(input.price);

                if(!Number.isFinite(numericPrice) || numericPrice < 0){
                    return res.status(400).json({
                        success:false,
                        message:"Item price must be a number greater than or equal to 0"
                    })
                }
                updates.price = numericPrice;
                continue;
            }

            updates[field] = input[field];
        }

        if(Object.keys(updates).length === 0){
            return res.status(400).json({
                success:false,
                message:"No valid fields to update"
            })
        }

        const item = await menuItemModel.findOneAndUpdate(
            {_id:itemId,store:store._id},
            {$set:updates},
            {new:true,runValidators:true}
        );

        if(!item){
            return res.status(404).json({
                success:false,
                message:"Item not found"
            })
        }

        return res.status(200).json({
            success:true,
            message:"Item updated successfully",
            data:{
                item:shapeItem(item)
            }
        })
    }catch(error){
        console.error("updateItem error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to update item"
        })
    }
}

// Removing an item is a real delete, the merchant can always add it back.
const deleteItem = async(req,res)=>{
    try{
        const {itemId} = req.params;

        if(!mongoose.isValidObjectId(itemId)){
            return res.status(400).json({
                success:false,
                message:"Invalid item id"
            })
        }

        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const item = await menuItemModel.findOneAndDelete({
            _id:itemId,
            store:store._id
        });

        if(!item){
            return res.status(404).json({
                success:false,
                message:"Item not found"
            })
        }

        return res.status(200).json({
            success:true,
            message:"Item deleted successfully"
        })
    }catch(error){
        console.error("deleteItem error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to delete item"
        })
    }
}

// A category takes its items with it, otherwise those items would be left with
// nothing to show them under.
const deleteCategory = async(req,res)=>{
    try{
        const {categoryId} = req.params;

        if(!mongoose.isValidObjectId(categoryId)){
            return res.status(400).json({
                success:false,
                message:"Invalid category id"
            })
        }

        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const menu = await menuModel.findOne({store:store._id});

        if(!menu){
            return res.status(404).json({
                success:false,
                message:"Menu not found"
            })
        }

        const category = await menuCategoryModel.findOneAndDelete({
            _id:categoryId,
            menu:menu._id,
            store:store._id
        });

        if(!category){
            return res.status(404).json({
                success:false,
                message:"Category not found"
            })
        }

        const removed = await menuItemModel.deleteMany({
            category:category._id,
            store:store._id
        });

        return res.status(200).json({
            success:true,
            message:"Category deleted successfully",
            data:{itemsRemoved:removed.deletedCount}
        })
    }catch(error){
        console.error("deleteCategory error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to delete category"
        })
    }
}

export {
    getPublicMenu,
    getMerchantMenu,
    createCategory,
    createItem,
    updateItem,
    deleteItem,
    deleteCategory
};
