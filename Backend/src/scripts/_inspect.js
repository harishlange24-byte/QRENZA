import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Merchant from "../models/merchant.model.js";
import Store from "../models/store.model.js";
import Subscription from "../models/subscription.model.js";
import Order from "../models/order.model.js";
import QueueEntry from "../models/queueEntry.model.js";
import LoyaltyCard from "../models/loyaltyCard.model.js";
import MenuItem from "../models/menuItem.model.js";
import Reward from "../models/reward.model.js";
import GiftCard from "../models/giftCard.model.js";
import Feedback from "../models/feedback.model.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const counts = {
    users: await User.countDocuments(),
    customers: await User.countDocuments({ role: "CUSTOMER" }),
    merchants: await Merchant.countDocuments(),
    stores: await Store.countDocuments(),
    subscriptions: await Subscription.countDocuments(),
    orders: await Order.countDocuments(),
    queueEntries: await QueueEntry.countDocuments(),
    loyaltyCards: await LoyaltyCard.countDocuments()
  };
  console.log("COUNTS", JSON.stringify(counts, null, 2));

  const target = await User.findOne({ phone: "6266280010" });
  console.log("TARGET USER", target ? { phone: target.phone, role: target.role, name: target.name } : null);

  if (target) {
    const merchant = await Merchant.findOne({ owner: target._id });
    console.log("TARGET MERCHANT", merchant ? { id: merchant._id, name: merchant.businessName, status: merchant.status } : null);
    if (merchant) {
      const stores = await Store.find({ merchant: merchant._id }).select("name publicCode status");
      console.log("TARGET STORES", JSON.stringify(stores, null, 2));

      for (const store of stores) {
        const perStore = {
          store: store.name,
          menuItems: await MenuItem.countDocuments({ store: store._id }),
          orders: await Order.countDocuments({ store: store._id }),
          queueEntries: await QueueEntry.countDocuments({ store: store._id }),
          loyaltyCards: await LoyaltyCard.countDocuments({ store: store._id }),
          rewards: await Reward.countDocuments({ store: store._id }),
          giftCards: await GiftCard.countDocuments({ store: store._id }),
          feedback: await Feedback.countDocuments({ store: store._id })
        };
        console.log("STORE DATA", JSON.stringify(perStore));
      }

      const sub = await Subscription.findOne({ merchant: merchant._id, isCurrent: true }).select("planCode status");
      console.log("TARGET SUB", sub ? { planCode: sub.planCode, status: sub.status } : null);
    }
  }

  const roles = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
  console.log("ROLES", JSON.stringify(roles, null, 2));

  const merchants = await Merchant.find().limit(10).select("businessName owner status");
  console.log("MERCHANTS", JSON.stringify(merchants, null, 2));
}

run()
  .catch((e) => console.error(e))
  .finally(async () => mongoose.disconnect());
