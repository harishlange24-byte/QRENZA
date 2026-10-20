// Physical Qrenza supplies a merchant orders from the panel: the printed QR
// standee and friends. Prices are integer paise, same rule as billing.
export const SUPPLY_CATALOG = [
    {
        id:"QR_STANDEE_A5",
        name:"QR standee (A5)",
        description:"Acrylic counter standee with a printed, replaceable QR card.",
        price:49900
    },
    {
        id:"QR_TABLE_TENT",
        name:"Table tent card",
        description:"Folded table card with the counter QR on both sides.",
        price:19900
    },
    {
        id:"QR_WALL_STICKER",
        name:"Wall sticker",
        description:"Weather proof QR sticker for the entrance or window.",
        price:9900
    },
    {
        id:"QR_STANDEE_LARGE",
        name:"Large floor standee",
        description:"Floor stand with a taller QR panel and a heavier base.",
        price:129900
    }
];

// Flat delivery charge added to every supply order, in paise.
export const SUPPLY_SHIPPING_FLAT = 4900;

export const findSupply = (id)=>{
    return SUPPLY_CATALOG.find((product)=>product.id === String(id || "").trim()) || null;
}
