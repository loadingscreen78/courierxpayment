"use client";

import React, { useState, useEffect } from 'react';
import { Globe, Truck, FileText, Gift, Pill, CheckCircle, ArrowRight, ChevronRight, ShieldCheck, Package, MapPin } from 'lucide-react';

export const CourierXMotionGraphic = () => {
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState({ x: -100, y: -100 });
  const [isClicking, setIsClicking] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState({
    type: '',
    country: '',
    weight: 'Up to 500g',
    senderName: '',
    senderPhone: '',
    medName: '',
    uploading: false,
    uploaded: false,
  });
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [showWeightDropdown, setShowWeightDropdown] = useState(false);
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  useEffect(() => {
    let isActive = true;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const moveCursor = (id: string) =>
      new Promise<void>((resolve) => {
        if (!isActive) return resolve();
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const randomX = (Math.random() - 0.5) * 12;
          const randomY = (Math.random() - 0.5) * 12;
          setCursor({
            x: rect.left + rect.width / 2 + randomX,
            y: rect.top + rect.height / 2 + randomY,
          });
        }
        setTimeout(resolve, 500 + Math.random() * 200);
      });

    const clickCursor = async () => {
      if (!isActive) return;
      await sleep(100 + Math.random() * 150);
      setIsClicking(true);
      await sleep(100 + Math.random() * 100);
      setIsClicking(false);
      await sleep(150 + Math.random() * 150);
    };

    const typeText = async (text: string, field: string) => {
      if (!isActive) return;
      setActiveInput(field);
      for (let i = 0; i <= text.length; i++) {
        if (!isActive) break;
        setFormData((prev) => ({ ...prev, [field]: text.slice(0, i) }));
        await sleep(Math.random() * 80 + 30 + (Math.random() > 0.9 ? 150 : 0));
      }
      await sleep(200);
      setActiveInput(null);
    };

    const runScript = async () => {
      setCursor({ x: window.innerWidth / 2 + 200, y: window.innerHeight / 2 + 300 });
      await sleep(1000);

      while (isActive) {
        setStep(0);
        setFormData({
          type: '', country: '', weight: 'Up to 500g',
          senderName: '', senderPhone: '', medName: '',
          uploading: false, uploaded: false,
        });
        setActiveInput(null);
        setShowWeightDropdown(false);
        setShowMedDropdown(false);
        await sleep(1000);

        // STEP 0
        await moveCursor('mg-btn-intl');
        await clickCursor();

        // STEP 1
        setStep(1);
        await sleep(800);
        await moveCursor('mg-box-medicine');
        await clickCursor();
        setFormData((p) => ({ ...p, type: 'medicine' }));
        await moveCursor('mg-input-country');
        await clickCursor();
        await typeText('United States (USA)', 'country');
        await moveCursor('mg-dropdown-weight');
        await clickCursor();
        setShowWeightDropdown(true);
        await sleep(400);
        await moveCursor('mg-option-weight-2kg');
        await clickCursor();
        setShowWeightDropdown(false);
        setFormData((p) => ({ ...p, weight: '1kg - 2kg' }));
        await moveCursor('mg-btn-calc');
        await clickCursor();

        // STEP 2
        setStep(2);
        await sleep(800);
        await moveCursor('mg-btn-book');
        await clickCursor();

        // STEP 3
        setStep(3);
        await sleep(800);
        await moveCursor('mg-input-name');
        await clickCursor();
        await typeText('Rahul Sharma', 'senderName');
        await moveCursor('mg-input-phone');
        await clickCursor();
        await typeText('+91 98XXXXXX00', 'senderPhone');
        await sleep(300);
        await moveCursor('mg-btn-next-sender');
        await clickCursor();

        // STEP 4
        setStep(4);
        await sleep(800);
        await moveCursor('mg-input-med-name');
        await clickCursor();
        await typeText('Dolo', 'medName');
        setShowMedDropdown(true);
        await sleep(600);
        await moveCursor('mg-option-med-dolo');
        await clickCursor();
        setShowMedDropdown(false);
        setFormData((p) => ({ ...p, medName: 'Dolo 650 Tablet' }));
        await sleep(200);
        await moveCursor('mg-btn-upload');
        await clickCursor();
        setFormData((p) => ({ ...p, uploading: true }));
        await sleep(1200);
        setFormData((p) => ({ ...p, uploading: false, uploaded: true }));
        await sleep(400);
        await moveCursor('mg-btn-next-content');
        await clickCursor();

        // STEP 5
        setStep(5);
        await sleep(1000);
        await moveCursor('mg-btn-pay');
        await clickCursor();

        // STEP 6 (Success)
        setStep(6);
        setCursor({ x: window.innerWidth / 2 + 300, y: window.innerHeight / 2 + 300 });
        await sleep(4500);
      }
    };

    runScript();
    return () => { isActive = false; };
  }, []);

  return (
    <div className="w-full h-[520px] font-sans bg-slate-100 overflow-hidden relative rounded-2xl shadow-2xl" ref={setContainerRef}>
      <div className="relative w-full h-full bg-white overflow-hidden flex flex-col pointer-events-none">
        {/* Mock Browser Header */}
        <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-2 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          </div>
          <div className="ml-3 flex-1 bg-white h-6 rounded-md border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-mono shadow-inner">
            courierx.in/book/international
          </div>
        </div>

        {/* Progress Indicator */}
        {step > 0 && step < 6 && (
          <div className="flex items-center px-5 pt-3 pb-1 gap-1.5 text-xs font-semibold text-slate-400 shrink-0">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-red-600' : 'bg-slate-200'}`}></div>
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-red-600' : 'bg-slate-200'}`}></div>
            <div className={`flex-1 h-1 rounded-full ${step >= 3 ? 'bg-slate-300' : 'bg-slate-200'}`}></div>
            <div className={`flex-1 h-1 rounded-full ${step >= 5 ? 'bg-red-600' : 'bg-slate-200'}`}></div>
          </div>
        )}

        {/* Animation Content Area */}
        <div className="flex-1 relative bg-slate-50 overflow-hidden flex justify-center">
          <div className="relative w-full max-w-3xl h-full pt-5">

            {/* STEP 0: Ship Now */}
            <div className={`transition-all duration-500 absolute w-full inset-x-0 px-4 ${step === 0 ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-base font-bold text-slate-800 mb-1.5 font-mono tracking-tight">Ship Now</h2>
              <p className="text-[11px] text-slate-500 mb-4">No account needed. Get an instant rate and book your shipment.</p>
              <div className="space-y-3">
                <div id="mg-btn-intl" className="bg-white border-2 rounded-xl p-3 flex gap-3 items-center shadow-sm border-blue-100">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 font-mono text-sm">International Shipping</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Send medicines, documents, gifts & personal items to 150+ countries.</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-600">Medicine</span>
                      <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-600">Document</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3 items-center opacity-70 grayscale">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 font-mono text-sm">Domestic Shipping</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Ship anywhere within India with top courier partners.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 1: Shipment Details */}
            <div className={`transition-all duration-500 absolute w-full inset-x-0 px-4 ${step === 1 ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-base font-bold text-slate-800 mb-3 font-mono tracking-tight flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" /> International Shipping
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="font-bold text-xs text-slate-800 font-mono mb-2">Enter shipment details to get rates</h3>
                <p className="text-[10px] text-slate-600 mb-1.5">What are you shipping?</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div id="mg-box-medicine" className={`border-2 rounded-lg p-2 transition-colors ${formData.type === 'medicine' ? 'border-slate-800 shadow-sm' : 'border-slate-200 opacity-60'}`}>
                    <Pill className={`w-3.5 h-3.5 mb-1 ${formData.type === 'medicine' ? 'text-slate-700' : 'text-slate-400'}`} />
                    <p className={`text-[10px] font-bold ${formData.type === 'medicine' ? 'text-slate-800' : 'text-slate-500'}`}>Medicine</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 opacity-50">
                    <FileText className="w-3.5 h-3.5 mb-1" /><p className="text-[10px] font-medium">Document</p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 opacity-50">
                    <Gift className="w-3.5 h-3.5 mb-1" /><p className="text-[10px] font-medium">Gift</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Destination Country</p>
                    <div id="mg-input-country" className={`w-full border rounded-md p-1.5 text-xs flex items-center h-8 transition-colors ${activeInput === 'country' ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-300 bg-slate-50'}`}>
                      {formData.country || <span className="text-slate-400">Search or select country...</span>}
                      {activeInput === 'country' && <span className="animate-pulse ml-0.5 text-blue-500 font-light">|</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Weight</p>
                    <div className="relative">
                      <div id="mg-dropdown-weight" className={`w-full border rounded-md p-1.5 text-xs flex justify-between items-center h-8 transition-colors ${showWeightDropdown ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-300 bg-slate-50'}`}>
                        {formData.weight} <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${showWeightDropdown ? '-rotate-90' : 'rotate-90'}`} />
                      </div>
                      {showWeightDropdown && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-md shadow-lg mt-1 z-20 overflow-hidden">
                          <div className="p-1.5 text-xs text-slate-500">Up to 500g</div>
                          <div id="mg-option-weight-2kg" className="p-1.5 text-xs bg-blue-50 font-medium text-slate-800">1kg - 2kg</div>
                          <div className="p-1.5 text-xs text-slate-500">2kg - 5kg</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button id="mg-btn-calc" className="w-full bg-red-600 text-white rounded-md py-2 mt-3 text-xs font-bold flex justify-center items-center gap-1.5">
                  Calculate Rates <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* STEP 2: Select Rate */}
            <div className={`transition-all duration-500 absolute w-full inset-x-0 px-4 ${step === 2 ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-base font-bold text-slate-800 mb-1.5 font-mono tracking-tight flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" /> International Shipping
              </h2>
              <p className="text-[10px] font-bold text-slate-800 font-mono mb-2">Available Rates</p>
              <div className="bg-white rounded-xl border-2 border-red-100 p-3 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg">Best Value</div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-800 font-mono">Aramex</h3>
                    <p className="text-[10px] text-slate-500">3-5 days delivery</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="text-[9px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-slate-500">Real-time tracking</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">₹3,702</p>
                    <p className="text-[9px] text-green-600">With account: ₹1,777</p>
                    <button id="mg-btn-book" className="mt-1.5 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded">Book Now</button>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between text-[10px] text-slate-500">
                  <span>Base rate: ₹926</span><span>Fuel: ₹178</span><span>GST: ₹213</span>
                </div>
              </div>
            </div>

            {/* STEP 3: Sender & Receiver */}
            <div className={`transition-all duration-500 absolute w-full inset-x-0 px-4 ${step === 3 ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-slate-100 rounded-lg p-2 mb-3 flex justify-between items-center text-xs">
                <span className="text-slate-500">Selected Courier: <span className="font-bold text-slate-800">Aramex</span></span>
                <span className="font-bold text-slate-800">₹3,702</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800">Indian Pickup Address</h3>
                    <p className="text-[9px] text-slate-500">Where should we collect?</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <p className="text-[9px] text-slate-500 mb-0.5">Full Name</p>
                    <div id="mg-input-name" className={`w-full border rounded p-1 text-[11px] h-7 flex items-center overflow-hidden transition-colors ${activeInput === 'senderName' ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                      {formData.senderName || (activeInput !== 'senderName' && <span className="text-slate-400">Sender name</span>)}
                      {activeInput === 'senderName' && <span className="animate-pulse ml-0.5 text-blue-500">|</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 mb-0.5">Phone</p>
                    <div id="mg-input-phone" className={`w-full border rounded p-1 text-[11px] h-7 flex items-center transition-colors ${activeInput === 'senderPhone' ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                      {formData.senderPhone || (activeInput !== 'senderPhone' && <span className="text-slate-400">+91</span>)}
                      {activeInput === 'senderPhone' && <span className="animate-pulse ml-0.5 text-blue-500">|</span>}
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-[9px] text-slate-500 mb-0.5">Full Address</p>
                  <div className="w-full border border-slate-200 rounded p-1 text-[11px] bg-slate-50">42, MG Road, Lajpat Nagar</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="border border-slate-200 rounded p-1 text-[11px] bg-slate-50 text-slate-400">110001</div>
                  <div className="border border-slate-200 rounded p-1 text-[11px] bg-slate-50 text-slate-400">New Delhi</div>
                </div>
                <button id="mg-btn-next-sender" className="w-full bg-red-600 text-white rounded-md py-1.5 text-xs font-bold flex justify-center items-center gap-1.5">
                  Next: Receiver Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* STEP 4: Contents */}
            <div className={`transition-all duration-500 absolute w-full inset-x-0 px-4 ${step === 4 ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 font-mono">Shipment Contents</h3>
                    <p className="text-[9px] text-slate-500">Add medicines for customs</p>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg p-2.5 mb-2.5 bg-slate-50/50">
                  <p className="text-[9px] font-bold text-slate-500 mb-1.5">Medicine 1</p>
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <div>
                      <p className="text-[9px] text-slate-500 mb-0.5">Medicine Name</p>
                      <div className="relative">
                        <div id="mg-input-med-name" className={`w-full border rounded p-1 text-[11px] h-7 flex items-center transition-colors ${activeInput === 'medName' ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-200 bg-white'}`}>
                          {formData.medName || (activeInput !== 'medName' && <span className="text-slate-400">e.g., Dolo 650</span>)}
                          {activeInput === 'medName' && <span className="animate-pulse ml-0.5 text-blue-500">|</span>}
                        </div>
                        {showMedDropdown && (
                          <div className="absolute top-full left-0 w-44 bg-white border border-slate-200 rounded-md shadow-xl mt-1 z-30 overflow-hidden">
                            <div id="mg-option-med-dolo" className="p-1.5 text-[11px] bg-blue-50 font-medium text-slate-800 flex justify-between items-center">
                              <span>Dolo 650 Tablet</span>
                              <span className="text-[8px] text-slate-400 bg-white px-1 rounded border border-slate-200">Medicine</span>
                            </div>
                            <div className="p-1.5 text-[11px] text-slate-500 flex justify-between items-center border-t border-slate-100">
                              <span>Dolo 250 Tablet</span>
                              <span className="text-[8px] text-slate-400 bg-white px-1 rounded border border-slate-200">Medicine</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 mb-0.5">Type</p>
                      <div className="w-full border-2 border-red-500 rounded p-1 text-[11px] bg-white flex justify-between items-center h-7">
                        Tablet <ChevronRight className="w-2.5 h-2.5 rotate-90" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="border border-slate-200 rounded p-1 text-[10px] bg-white text-slate-400">30049099</div>
                    <div className="border border-slate-200 rounded p-1 text-[10px] bg-white text-center">1</div>
                    <div className="border border-slate-200 rounded p-1 text-[10px] bg-white text-slate-400">₹0</div>
                  </div>
                </div>
                <div id="mg-btn-upload" className={`border rounded-lg p-2.5 border-dashed flex justify-center items-center text-[11px] font-bold gap-1.5 transition-colors ${formData.uploaded ? 'border-green-500 bg-green-50 text-green-700' : 'border-blue-200 bg-blue-50/30 text-blue-600'}`}>
                  {formData.uploading ? (
                    <span className="animate-pulse flex items-center gap-1.5">Uploading...</span>
                  ) : formData.uploaded ? (
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Prescription.pdf</span>
                  ) : (
                    <span>Upload Prescription (PDF/JPG)</span>
                  )}
                </div>
                <button id="mg-btn-next-content" className="w-full bg-slate-800 text-white rounded-md py-1.5 mt-3 text-xs font-bold flex justify-center items-center gap-1.5">
                  Continue to Summary <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* STEP 5: Summary & Pay */}
            <div className={`transition-all duration-500 absolute w-full inset-x-0 px-4 ${step === 5 ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-4'}`}>
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm mb-2.5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-2.5">
                  <div>
                    <h3 className="font-bold text-base text-slate-800 font-mono">Aramex</h3>
                    <p className="text-[9px] text-slate-500">International • Medicine</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">₹3,702</p>
                    <p className="text-[9px] text-slate-500">incl. GST</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <p className="text-slate-400 mb-0.5 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Sender</p>
                    <p className="font-medium text-slate-700">Rahul Sharma</p>
                    <p className="text-slate-500 truncate">+91 98XXXXXX00</p>
                    <p className="text-[9px] text-slate-400 truncate">rXXXXX@email.com</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Receiver</p>
                    <p className="font-medium text-slate-700">Jane Doe</p>
                    <p className="text-slate-500 truncate">+1 20XXXXXX99</p>
                    <p className="text-[9px] text-slate-400 truncate">jXXXXX@email.com</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-green-200 p-2.5 shadow-sm mb-3 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-[11px] font-bold text-green-700">Aadhaar Verified</p>
                  <p className="text-[9px] text-green-600">XXXX XXXX 2082</p>
                </div>
              </div>
              <button id="mg-btn-pay" className="w-full bg-red-600 text-white rounded-md py-2.5 text-xs font-bold flex justify-center items-center gap-1.5 shadow-lg shadow-red-200 relative overflow-hidden group">
                <span className="relative z-10">Pay ₹3,702 & Ship Now</span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] animate-[mg-shimmer_2s_infinite]"></div>
              </button>
            </div>

            {/* STEP 6: Success State */}
            <div className={`transition-all duration-700 absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20 ${step === 6 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-50"></div>
                <CheckCircle className="w-16 h-16 text-green-500 relative z-10 bg-slate-50 rounded-full" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 text-center mb-1.5 tracking-tight">
                From Click to Doorstep—<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">Effortless.</span>
              </h2>
              <p className="text-slate-500 text-center max-w-[220px] mt-1.5 text-[11px]">
                Your shipment has been booked successfully. Our pickup executive will reach out soon.
              </p>
              {/* iOS-Style Floating Dock */}
              <div className="mt-6 flex items-center gap-3 bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-xl shadow-slate-200/50 px-4 py-3 rounded-[2rem] relative z-10">
                <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                  <Package className="w-5 h-5 text-slate-700 animate-bounce" style={{ animationDelay: '0ms' }} />
                </div>
                <div className="h-1.5 w-8 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 animate-[mg-fill_3s_ease-in-out_infinite]"></div>
                </div>
                <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                  <Truck className="w-5 h-5 text-red-500" />
                </div>
                <div className="h-1.5 w-8 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 animate-[mg-fill_3s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }}></div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-md flex items-center justify-center border border-blue-400/50">
                  <Globe className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Fake Mouse Cursor Overlay */}
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: `${cursor.x}px`,
          top: `${cursor.y}px`,
          transition: 'left 0.7s cubic-bezier(0.4, 0.0, 0.2, 1), top 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          className={`drop-shadow-xl transition-transform duration-150 ${isClicking ? 'scale-75' : 'scale-100'}`}
          style={{ transformOrigin: 'top left', transform: 'translate(-2px, -2px)' }}
        >
          <path
            d="M4 2.5L11 21.5L14 14.5L21 11.5L4 2.5Z"
            fill="#0f172a"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <style>{`
        @keyframes mg-shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes mg-fill {
          0% { width: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { width: 100%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
