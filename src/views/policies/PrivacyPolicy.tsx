"use client";

import { LandingHeader, LandingFooter } from '@/components/landing';
import { Shield, Lock, Database, Share2, Clock, AlertTriangle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const sectionClass = "bg-card border border-border rounded-2xl p-8";
const h2Class = "text-2xl font-bold font-typewriter text-foreground mb-4 flex items-center gap-3";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingHeader />
      <main className="flex-1 py-16">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coke-red/10 text-coke-red mb-4">
              <Shield className="h-5 w-5" />
              <span className="font-semibold text-sm">Legal</span>
            </div>
            <h1 className="text-4xl font-bold font-typewriter text-foreground mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">Effective Date: 23rd February 2026</p>
          </motion.div>

          <div className="prose prose-gray max-w-none space-y-10">
            {/* 1. Introduction */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Shield className="h-6 w-6 text-coke-red" />
                1. Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                CourierX™ is operated by Goldilocks Zone Private Limited. This Privacy Policy explains how we collect, use, and protect personal information.
              </p>
            </motion.section>

            {/* 2. Information Collected */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Database className="h-6 w-6 text-coke-red" />
                2. Information Collected
              </h2>

              <div className="space-y-4">
                <div className="bg-muted/30 rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-2">Identity &amp; KYC</h3>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>PAN</li>
                    <li>Aadhaar</li>
                    <li>Passport</li>
                    <li>Address</li>
                    <li>Contact details</li>
                  </ul>
                </div>
                <div className="bg-muted/30 rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-2">Shipment Data</h3>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Sender/receiver details</li>
                    <li>Content declaration</li>
                    <li>Prescription documents</li>
                  </ul>
                </div>
                <div className="bg-muted/30 rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-2">Payment Metadata</h3>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li>Transaction IDs</li>
                    <li>Gateway references</li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-2">CourierX™ does not store full card details.</p>
                </div>
              </div>
            </motion.section>

            {/* 3. Legal Basis */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Lock className="h-6 w-6 text-coke-red" />
                3. Legal Basis
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-2">We process data for:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Contract fulfillment</li>
                <li>Export &amp; customs compliance</li>
                <li>Fraud prevention</li>
                <li>Regulatory reporting</li>
              </ul>
            </motion.section>

            {/* 4. Sensitive Personal Data */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Shield className="h-6 w-6 text-coke-red" />
                4. Sensitive Personal Data
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Under the Information Technology Act, 2000 and SPDI Rules, identity documents and prescriptions are treated as sensitive personal data. We implement reasonable security practices.
              </p>
            </motion.section>

            {/* 5. Data Retention */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Clock className="h-6 w-6 text-coke-red" />
                5. Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">Data is retained:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Until regulatory audit closure</li>
                <li>Or as required by law</li>
              </ul>
            </motion.section>

            {/* 6. Data Sharing */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Share2 className="h-6 w-6 text-coke-red" />
                6. Data Sharing
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-2">Data may be shared with:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Courier partners</li>
                <li>Customs authorities</li>
                <li>Law enforcement</li>
                <li>Regulatory agencies</li>
                <li>Payment processors</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4 p-4 bg-coke-red/5 rounded-xl border border-coke-red/20">
                <strong className="text-coke-red">Important:</strong> We do not sell personal data.
              </p>
            </motion.section>

            {/* 7. Data Breach */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className={sectionClass}>
              <h2 className={h2Class}>
                <AlertTriangle className="h-6 w-6 text-coke-red" />
                7. Data Breach
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Material breaches will be addressed in accordance with applicable laws.
              </p>
            </motion.section>

            {/* 8. Grievance Officer */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="bg-coke-red/5 border border-coke-red/20 rounded-2xl p-8">
              <h2 className={h2Class}>
                <Mail className="h-6 w-6 text-coke-red" />
                8. Grievance Officer
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-foreground font-semibold">Sangram Keshari Adhikary</p>
                  <p className="text-muted-foreground text-sm mt-1">Grievance Officer</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">
                    <strong className="text-foreground">Email:</strong> grievances@courierx.in<br />
                    <strong className="text-foreground">Address:</strong> Cuttack Office<br />
                    <strong className="text-foreground">Response Timeline:</strong> 15 days
                  </p>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
};

export default PrivacyPolicy;

