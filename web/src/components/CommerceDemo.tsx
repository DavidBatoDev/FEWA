"use client";

import { useState } from "react";
import { ShoppingBag, CreditCard, CheckCircle, Package, ArrowRight, RotateCcw, AlertCircle } from "lucide-react";

export function CommerceDemo() {
  const [selectedProduct, setSelectedProduct] = useState<string>("Lenovo ThinkPad E14 Gen 5");
  const [productPrice, setProductPrice] = useState<number>(58999);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"preferences" | "verify" | "gcash" | "success">("preferences");
  const [gcashRef, setGcashRef] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const products = [
    {
      name: "Lenovo ThinkPad E14 Gen 5",
      price: 58999,
      specs: "Intel Core i5 · 16GB RAM · 512GB SSD · Mil-Spec Toughness",
      fitReason: "Best fit for programming, heavy coding, and durability."
    },
    {
      name: "ASUS VivoBook 14 Slim",
      price: 54990,
      specs: "AMD Ryzen 5 · 16GB RAM · 512GB SSD · OLED Display",
      fitReason: "Ideal for content creation, movies, and light office work."
    },
    {
      name: "Acer Swift Go 14 OLED",
      price: 49999,
      specs: "Intel Core i5 · 8GB RAM · 512GB SSD · Ultra-lightweight",
      fitReason: "Perfect budget option for students and light travelers."
    }
  ];

  const activeProduct = products.find(p => p.name === selectedProduct) || products[0];

  const handleProductSelect = (name: string, price: number) => {
    setSelectedProduct(name);
    setProductPrice(price);
    setCheckoutStep("preferences");
  };

  const handleNextStep = () => {
    if (checkoutStep === "preferences") {
      setCheckoutStep("verify");
    } else if (checkoutStep === "verify") {
      if (!name || !address || !phone) return;
      setIsVerifying(true);
      setTimeout(() => {
        setIsVerifying(false);
        const refSuffix = Math.floor(10000 + Math.random() * 90000);
        setGcashRef(`WPH-2026-${refSuffix}`);
        setCheckoutStep("gcash");
      }, 1200);
    }
  };

  const handleConfirmPayment = () => {
    setCheckoutStep("success");
  };

  const handleReset = () => {
    setName("");
    setAddress("");
    setPhone("");
    setCheckoutStep("preferences");
    setSelectedProduct("Lenovo ThinkPad E14 Gen 5");
    setProductPrice(58999);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      
      {/* Visual Binder Band at the top of the Shopping Panel */}
      <div className="relative z-10 -mb-6 flex justify-around px-8 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-850" />
            <div className="w-3 h-10 rounded-full bg-gradient-to-b from-purple-600 via-purple-400 to-purple-700 border border-white/20 shadow-lg -mt-1" />
          </div>
        ))}
      </div>

      {/* Main Wall panel */}
      <div className="relative rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Panel Header */}
        <div className="bg-zinc-950/80 px-6 py-6 border-b border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-widest text-white uppercase flex items-center gap-2">
                B2C CHECKOUT PIPELINE
                <span className="text-xs font-mono font-medium tracking-normal text-zinc-500 lowercase bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.04]">
                  commerce-v1
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Conversational Checkout Sandbox — Choose a product, verify address details, and simulate GCash reference billing</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-white/[0.02] border border-white/[0.05] px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Active Mode: Product Catalog Matches
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left Column: Form & Catalog selection */}
          <div className="lg:col-span-7 p-6 space-y-6 border-r border-white/[0.05]">
            
            {/* Catalog list */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">1. Select Product Catalog Item</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {products.map((prod) => {
                  const isSelected = selectedProduct === prod.name;
                  return (
                    <button
                      key={prod.name}
                      onClick={() => handleProductSelect(prod.name, prod.price)}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all min-h-[140px] ${
                        isSelected 
                          ? "border-purple-500 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                          : "border-white/[0.06] bg-zinc-950/40 hover:border-white/[0.1] hover:bg-zinc-950/60"
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block ${isSelected ? "text-purple-400" : "text-white"}`}>{prod.name.split(" ")[0]} {prod.name.split(" ")[1]}</span>
                        <span className="text-[10px] text-zinc-500 line-clamp-2 mt-1">{prod.specs}</span>
                      </div>
                      <span className="text-sm font-black text-white font-mono mt-3">₱{prod.price.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Criteria Match Note */}
            <div className="p-4 rounded-2xl bg-purple-950/10 border border-purple-500/20 text-xs text-zinc-350 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Faye AI Preference analysis</span>
              {activeProduct.fitReason}
            </div>

            {/* Input Details */}
            {checkoutStep !== "success" ? (
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">2. Delivery Verification Details</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-500">Customer Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Juan dela Cruz"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={checkoutStep !== "preferences" && checkoutStep !== "verify"}
                      className="w-full text-xs rounded-xl border border-white/[0.08] bg-zinc-950 px-3.5 py-3 text-white outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-500">Mobile Phone Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0917-889-1243"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={checkoutStep !== "preferences" && checkoutStep !== "verify"}
                      className="w-full text-xs rounded-xl border border-white/[0.08] bg-zinc-950 px-3.5 py-3 text-white outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-500">Shipping Delivery Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Project 4, Quezon City, Metro Manila"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={checkoutStep !== "preferences" && checkoutStep !== "verify"}
                    className="w-full text-xs rounded-xl border border-white/[0.08] bg-zinc-950 px-3.5 py-3 text-white outline-none focus:border-purple-500/50"
                  />
                </div>

                {checkoutStep === "preferences" && (
                  <button
                    onClick={handleNextStep}
                    disabled={!name || !address || !phone}
                    className="w-full rounded-2xl bg-purple-500 hover:bg-purple-400 disabled:bg-zinc-800 disabled:text-zinc-650 text-white font-bold py-3.5 flex items-center justify-center gap-2 text-sm transition-all"
                  >
                    <span>Proceed to Verify Address</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {checkoutStep === "verify" && (
                  <button
                    onClick={handleNextStep}
                    className="w-full rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-bold py-3.5 flex items-center justify-center gap-2 text-sm transition-all relative overflow-hidden"
                  >
                    {isVerifying ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Initializing GCash Invoice...
                      </span>
                    ) : (
                      <>
                        <span>Generate GCash QR & Reference Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-extrabold text-base text-white">Order Confirmed!</h4>
                  <p className="text-xs text-zinc-450">GCash reference payment verified successfully.</p>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-xl border border-white/[0.08] hover:bg-white/[0.04] px-4 py-2.5 text-xs text-zinc-300 font-semibold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Run Another Simulation
                </button>
              </div>
            )}

          </div>

          {/* Right Column: Checkout preview and status screens */}
          <div className="lg:col-span-5 p-6 bg-zinc-950/40 flex flex-col justify-between">
            
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">3. Live Screen Preview</span>

              {/* Preferences matching view */}
              {checkoutStep === "preferences" && (
                <div className="p-5 rounded-3xl border border-white/[0.06] bg-zinc-900/60 space-y-4 text-xs">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5 text-purple-400">
                    <Package className="w-4 h-4" />
                    Faye Checkout Cart
                  </h4>
                  <div className="space-y-2.5 pb-3 border-b border-white/[0.05]">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-200">{activeProduct.name}</span>
                      <span className="font-mono text-zinc-400">Qty: 1</span>
                    </div>
                    <p className="text-[10px] text-zinc-550 leading-relaxed">{activeProduct.specs}</p>
                  </div>
                  <div className="flex justify-between font-bold text-white">
                    <span className="text-zinc-500">Order Subtotal</span>
                    <span className="font-mono text-purple-400">₱{activeProduct.price.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Address validation view */}
              {checkoutStep === "verify" && (
                <div className="p-5 rounded-3xl border border-purple-500/40 bg-purple-950/5 shadow-[0_0_20px_rgba(168,85,247,0.1)] space-y-4 text-xs">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5 text-purple-400">
                    <AlertCircle className="w-4 h-4 text-purple-400 animate-pulse" />
                    Verify Shipping Context
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-zinc-500">Name:</span>
                      <span className="col-span-2 font-semibold text-zinc-200">{name}</span>
                      
                      <span className="text-zinc-500">Phone:</span>
                      <span className="col-span-2 font-mono text-zinc-300">{phone}</span>

                      <span className="text-zinc-500">Address:</span>
                      <span className="col-span-2 font-semibold text-zinc-200 leading-relaxed">{address}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-950 border border-white/[0.04] text-[10px] text-zinc-550">
                    Faye will spell-check and confirm these details before generating the GCash invoice.
                  </div>
                </div>
              )}

              {/* GCash Verification screen */}
              {checkoutStep === "gcash" && (
                <div className="p-5 rounded-3xl border border-purple-500/40 bg-purple-950/5 shadow-[0_0_20px_rgba(168,85,247,0.15)] space-y-4 text-xs">
                  <div className="text-center space-y-1.5 pb-3 border-b border-white/[0.05]">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-purple-400">GCash Scan Billing</span>
                    <h4 className="font-black text-lg text-white font-mono">₱{productPrice.toLocaleString()}</h4>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl w-28 h-28 mx-auto shadow-lg relative">
                    {/* Mock QR Code representation */}
                    <div className="grid grid-cols-4 gap-1 w-full h-full bg-zinc-100 p-2 text-zinc-900 border border-zinc-200 font-mono text-[8px] overflow-hidden select-none select-none pointer-events-none">
                      <span>⬛</span><span>⬜</span><span>⬛</span><span>⬛</span>
                      <span>⬜</span><span>⬛</span><span>⬜</span><span>⬜</span>
                      <span>⬛</span><span>⬜</span><span>⬛</span><span>⬛</span>
                      <span>⬛</span><span>⬛</span><span>⬜</span><span>⬜</span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-zinc-500">Invoice Ref:</span>
                      <span className="font-mono text-zinc-300 font-bold">{gcashRef}</span>
                    </div>
                    <button
                      onClick={handleConfirmPayment}
                      className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                    >
                      Simulate Payout Received
                    </button>
                  </div>
                </div>
              )}

              {/* Success receipt screen */}
              {checkoutStep === "success" && (
                <div className="p-5 rounded-3xl border border-emerald-500/30 bg-zinc-900/60 space-y-4 text-xs font-mono">
                  <div className="text-center pb-3 border-b border-white/[0.05]">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">GCASH VERIFIED ✓</span>
                    <h5 className="font-black text-sm text-zinc-100 mt-2">WPH SHOPPING RECEIPT</h5>
                  </div>
                  <div className="space-y-2 text-[11px] text-zinc-405 leading-relaxed">
                    <div className="flex justify-between"><span>Product:</span><span className="text-zinc-205">{activeProduct.name.split(" ")[0]} Laptop</span></div>
                    <div className="flex justify-between"><span>Amount:</span><span className="text-zinc-205">₱{productPrice.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Buyer:</span><span className="text-zinc-205 truncate max-w-[120px]">{name}</span></div>
                    <div className="flex justify-between"><span>Reference:</span><span className="text-zinc-205 font-bold">{gcashRef.replace("WPH", "GCASH")}</span></div>
                  </div>
                  <div className="p-2.5 bg-zinc-950 border border-white/[0.04] rounded-xl text-[10px] text-zinc-550 text-center font-sans">
                    Faye: Order record WPH checkout logged in Couchbase Database scope!
                  </div>
                </div>
              )}

            </div>

            <div className="mt-6 text-[10px] text-zinc-550 flex items-start gap-1.5 bg-zinc-950/40 p-3 rounded-xl border border-white/[0.03]">
              <CreditCard className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>GCash direct payment simulated successfully via Faye&apos;s checkout_prep() tool callback.</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
