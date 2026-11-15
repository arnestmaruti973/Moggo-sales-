require("dotenv").config();
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "vehicles.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS applications (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 full_name TEXT NOT NULL, phone TEXT NOT NULL, whatsapp TEXT NOT NULL,
 email TEXT, national_id TEXT, county TEXT NOT NULL, town TEXT, location TEXT,
 vehicle_type TEXT NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL,
 colour TEXT, condition_type TEXT, payment_method TEXT,
 deposit TEXT, monthly_payment TEXT, employment_status TEXT, income_range TEXT,
 delivery_time TEXT, comments TEXT, status TEXT NOT NULL DEFAULT 'New'
);
CREATE TABLE IF NOT EXISTS vehicles (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 type TEXT NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL,
 price TEXT, condition_type TEXT DEFAULT 'New', description TEXT DEFAULT '',
 image_url TEXT DEFAULT '', featured INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const initialSettings = {
 company_name: process.env.COMPANY_NAME || "Goldline Motors",
 whatsapp: process.env.BUSINESS_WHATSAPP || "2547XXXXXXXX",
 phone: "",
 email: "",
 address: "",
 about: "Your trusted partner for quality motorbikes and cars. We make finding your next vehicle straightforward and convenient."
};
const insertSetting = db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)");
for (const [k,v] of Object.entries(initialSettings)) insertSetting.run(k, v);

const vehicleCount = db.prepare("SELECT COUNT(*) AS n FROM vehicles").get().n;
if (!vehicleCount) {
 const seed = db.prepare("INSERT INTO vehicles(type,brand,model,price,condition_type,description,image_url,featured) VALUES(?,?,?,?,?,?,?,?)");
 [
  ["Motorbike","Bajaj Boxer","Boxer 150","Contact for price","New","Reliable everyday motorbike.","https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900",1],
  ["Motorbike","TVS","HLX 150","Contact for price","New","Practical and economical ride.","https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900",0],
  ["Motorbike","Honda","CB 125","Contact for price","New","A versatile option for daily travel.","https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900",0],
  ["Car","Toyota","Corolla","Contact for price","Used","Comfortable and dependable family car.","https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=900",1],
  ["Car","Nissan","Note","Contact for price","Used","Compact and practical city vehicle.","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900",0],
  ["Car","Mazda","Demio","Contact for price","Used","Compact vehicle for everyday use.","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900",0]
 ].forEach(x=>seed.run(...x));
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({limit:"100kb"}));
app.use(express.urlencoded({extended:false}));
app.use(session({
 secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
 resave:false, saveUninitialized:false,
 cookie:{ httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", maxAge: 8*60*60*1000 }
}));
app.use(express.static(path.join(__dirname,"public")));

const loginLimiter = rateLimit({windowMs:15*60*1000, limit:8, standardHeaders:true, legacyHeaders:false});
const settingsGet = () => Object.fromEntries(db.prepare("SELECT key,value FROM settings").all().map(x=>[x.key,x.value]));
const requireAdmin = (req,res,next) => req.session && req.session.admin ? next() : res.status(401).json({error:"Please log in as administrator."});

app.get("/api/public", (req,res) => {
 const settings=settingsGet();
 res.json({settings:{company_name:settings.company_name,whatsapp:settings.whatsapp,phone:settings.phone,email:settings.email,address:settings.address,about:settings.about},
 vehicles:db.prepare("SELECT * FROM vehicles ORDER BY featured DESC,id DESC").all()});
});

app.post("/api/applications", (req,res) => {
 const b=req.body || {};
 const required=["full_name","phone","whatsapp","county","vehicle_type","brand","model"];
 for (const f of required) if (!String(b[f]||"").trim()) return res.status(400).json({error:`Please complete ${f.replaceAll("_"," ")}.`});
 if (!["Motorbike","Car"].includes(b.vehicle_type)) return res.status(400).json({error:"Choose a valid vehicle type."});
 const clean = v => String(v||"").trim().slice(0,1000);
 const fields=["full_name","phone","whatsapp","email","national_id","county","town","location","vehicle_type","brand","model","colour","condition_type","payment_method","deposit","monthly_payment","employment_status","income_range","delivery_time","comments"];
 const values=fields.map(f=>clean(b[f]));
 const result=db.prepare(`INSERT INTO applications(${fields.join(",")}) VALUES(${fields.map(()=>"?").join(",")})`).run(...values);
 const s=settingsGet();
 const msg = [
  `NEW VEHICLE APPLICATION - ${s.company_name}`,
  "",
  "PERSONAL INFORMATION",
  `Full Name: ${clean(b.full_name)}`,
  `Phone Number: ${clean(b.phone)}`,
  `WhatsApp Number: ${clean(b.whatsapp)}`,
  `Email: ${clean(b.email)||"Not provided"}`,
  `National ID: ${clean(b.national_id)||"Not provided"}`,
  `County: ${clean(b.county)}`,
  `Town: ${clean(b.town)||"Not provided"}`,
  `Physical Location: ${clean(b.location)||"Not provided"}`,
  "",
  "VEHICLE DETAILS",
  `Vehicle Type: ${clean(b.vehicle_type)}`,
  `Brand: ${clean(b.brand)}`,
  `Model: ${clean(b.model)}`,
  `Preferred Colour: ${clean(b.colour)||"Not specified"}`,
  `Condition: ${clean(b.condition_type)||"Not specified"}`,
  `Payment Method: ${clean(b.payment_method)||"Not specified"}`,
  "",
  "FINANCIAL INFORMATION",
  `Available Deposit: ${clean(b.deposit)||"Not provided"}`,
  `Preferred Monthly Payment: ${clean(b.monthly_payment)||"Not provided"}`,
  `Employment Status: ${clean(b.employment_status)||"Not provided"}`,
  `Monthly Income Range: ${clean(b.income_range)||"Not provided"}`,
  "",
  "ADDITIONAL INFORMATION",
  `When Needed: ${clean(b.delivery_time)||"Not specified"}`,
  `Comments: ${clean(b.comments)||"None"}`,
  "",
  `Application reference: MOGGO-${new Date().getFullYear()}-${String(result.lastInsertRowid).padStart(4,"0")}`,,
  "Please contact this customer to discuss the application."
 ].join("\n");
 const number=String(s.whatsapp||"").replace(/\D/g,"");
 const url=`https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
 res.status(201).json({ok:true,reference:result.lastInsertRowid,whatsappUrl:url});
});

app.post("/api/admin/login", loginLimiter, async (req,res) => {
 const {username,password}=req.body||{};
 const expectedUser=process.env.ADMIN_USERNAME||"admin";
 const hash=process.env.ADMIN_PASSWORD_HASH||"";
 if (!hash || username!==expectedUser || !await bcrypt.compare(String(password||""),hash))
  return res.status(401).json({error:"Invalid username or password. Check your server environment settings."});
 req.session.admin=true;
 res.json({ok:true});
});
app.post("/api/admin/logout", requireAdmin, (req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({authenticated:!!(req.session&&req.session.admin)}));

app.get("/api/admin/stats",requireAdmin,(req,res)=>{
 res.json({
  total:db.prepare("SELECT COUNT(*) n FROM applications").get().n,
  new:db.prepare("SELECT COUNT(*) n FROM applications WHERE status='New'").get().n,
  vehicles:db.prepare("SELECT COUNT(*) n FROM vehicles").get().n,
  recent:db.prepare("SELECT * FROM applications ORDER BY id DESC LIMIT 6").all()
 });
});
app.get("/api/admin/applications",requireAdmin,(req,res)=>{
 res.json(db.prepare("SELECT * FROM applications ORDER BY id DESC").all());
});
app.patch("/api/admin/applications/:id",requireAdmin,(req,res)=>{
 const status=String(req.body.status||"");
 if(!["New","Contacted","Approved","Declined","Completed"].includes(status)) return res.status(400).json({error:"Invalid status."});
 db.prepare("UPDATE applications SET status=? WHERE id=?").run(status,Number(req.params.id));
 res.json({ok:true});
});
app.get("/api/admin/vehicles",requireAdmin,(req,res)=>res.json(db.prepare("SELECT * FROM vehicles ORDER BY id DESC").all()));
app.post("/api/admin/vehicles",requireAdmin,(req,res)=>{
 const b=req.body||{};
 if(!b.type||!b.brand||!b.model) return res.status(400).json({error:"Vehicle type, brand and model are required."});
 const r=db.prepare("INSERT INTO vehicles(type,brand,model,price,condition_type,description,image_url,featured) VALUES(?,?,?,?,?,?,?,?)")
 .run(b.type,b.brand,b.model,b.price||"",b.condition_type||"New",b.description||"",b.image_url||"",b.featured?1:0);
 res.status(201).json({id:r.lastInsertRowid});
});
app.put("/api/admin/vehicles/:id",requireAdmin,(req,res)=>{
 const b=req.body||{};
 db.prepare("UPDATE vehicles SET type=?,brand=?,model=?,price=?,condition_type=?,description=?,image_url=?,featured=? WHERE id=?")
 .run(b.type,b.brand,b.model,b.price||"",b.condition_type||"New",b.description||"",b.image_url||"",b.featured?1:0,Number(req.params.id));
 res.json({ok:true});
});
app.delete("/api/admin/vehicles/:id",requireAdmin,(req,res)=>{
 db.prepare("DELETE FROM vehicles WHERE id=?").run(Number(req.params.id));res.json({ok:true});
});
app.get("/api/admin/settings",requireAdmin,(req,res)=>res.json(settingsGet()));
app.put("/api/admin/settings",requireAdmin,(req,res)=>{
 const allowed=["company_name","whatsapp","phone","email","address","about"];
 const up=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
 for(const k of allowed) if(req.body[k]!==undefined) up.run(k,String(req.body[k]).trim());
 res.json({ok:true});
});

app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Vehicle website running on http://localhost:${PORT}`));
