"use client";

import { LandingHeader, LandingFooter } from '@/components/landing';
import { FileText, Scale, Shield, AlertTriangle, Wallet, Ban, Globe, Gavel } from 'lucide-react';
import { motion } from 'framer-motion';

const sectionClass = "bg-card border border-border rounded-2xl p-8";
const h2Class = "text-2xl font-bold font-typewriter text-foreground mb-4 flex items-center gap-3";

const TermsAndConditions = () => {
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
              <FileText className="h-5 w-5" />
              <span className="font-semibold text-sm">Legal</span>
            </div>
            <h1 className="text-4xl font-bold font-typewriter text-foreground mb-4">CourierX™ Terms of Service</h1>
            <p className="text-muted-foreground">Effective Date: 23rd February 2026</p>
            <p className="text-muted-foreground text-sm mt-2">
              Operated by: Goldilocks Zone Private Limited<br />
              Registered Address: At, Rathagadasahi, Urali, Cuttack, Cuttack Sadar, Orissa, India, 753011<br />
              CIN: U52290OD2026PTC053323<br />
              Governing Law: Orissa, India
            </p>
          </motion.div>

          <div className="prose prose-gray max-w-none space-y-10">

            {/* 1. Platform Nature */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Globe className="h-6 w-6 text-coke-red" />
                1. Platform Nature
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                CourierX™ is a technology-enabled logistics intermediary platform that facilitates shipment bookings between users and licensed third-party courier partners.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-2">CourierX™:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Does not operate as a principal carrier</li>
                <li>Does not physically transport goods</li>
                <li>Does not act as exporter or importer of record</li>
                <li>Does not guarantee customs clearance</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                All transportation services are performed by independent courier partners subject to their own terms and liability policies.
              </p>
            </motion.section>

            {/* 2. Eligibility */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Shield className="h-6 w-6 text-coke-red" />
                2. Eligibility
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-2">To use CourierX™, you must:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Be at least 18 years old</li>
                <li>Provide accurate KYC documents</li>
                <li>Provide truthful shipment declarations</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                CourierX™ reserves the right to suspend or terminate accounts for non-compliance.
              </p>
            </motion.section>

            {/* 3. Shipper of Record */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={sectionClass}>
              <h2 className={h2Class}>
                <FileText className="h-6 w-6 text-coke-red" />
                3. Shipper of Record
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You are the legal Shipper of Record for all shipments. You are fully responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Accuracy of declared contents</li>
                <li>Regulatory compliance</li>
                <li>Customs documentation</li>
                <li>Authenticity of prescriptions</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                CourierX™ performs document verification but does not independently validate medical prescriptions beyond document review.
              </p>
            </motion.section>

            {/* 4. Insurance & Liability */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Shield className="h-6 w-6 text-coke-red" />
                4. Insurance &amp; Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">Insurance is optional. Maximum insurance coverage per shipment: ₹25,000.</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                <li>If insured: Liability is limited to the insured amount.</li>
                <li>If uninsured: Liability is limited to the service fee paid.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-2">CourierX™ shall not be liable for:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Indirect or consequential losses</li>
                <li>Customs seizure or penalties</li>
                <li>Regulatory delays</li>
                <li>Acts of government authorities</li>
                <li>Force majeure events</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Carrier compensation remains subject to respective courier partner policies.
              </p>
            </motion.section>

            {/* 5. Refund Framework */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Wallet className="h-6 w-6 text-coke-red" />
                5. Refund Framework
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Refund eligibility is governed by shipment stage. Full details are available in the Refund &amp; Cancellation Policy.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                All refunds are credited to the CourierX™ wallet only. Refunds are not returned to the original payment source except upon permanent account deletion, subject to verification.
              </p>
            </motion.section>

            {/* 6. Wallet Terms */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Wallet className="h-6 w-6 text-coke-red" />
                6. Wallet Terms
              </h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Wallet balances are non-interest bearing</li>
                <li>Not transferable</li>
                <li>Not redeemable except upon permanent account deletion</li>
                <li>Not classified as a prepaid payment instrument</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                CourierX™ may withhold wallet withdrawals in cases of suspected fraud, disputes, or regulatory review.
              </p>
            </motion.section>

            {/* 7. Indemnification */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Scale className="h-6 w-6 text-coke-red" />
                7. Indemnification
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                You agree to indemnify CourierX™ and its officers against any claims arising from:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>False declarations</li>
                <li>Shipment of prohibited items</li>
                <li>Customs penalties</li>
                <li>Regulatory violations</li>
                <li>Fraudulent activities</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">This obligation survives account termination.</p>
            </motion.section>

            {/* 8. AML & Sanctions Compliance */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Shield className="h-6 w-6 text-coke-red" />
                8. AML &amp; Sanctions Compliance
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-2">CourierX™ may:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Monitor suspicious transactions</li>
                <li>Report unlawful activities</li>
                <li>Refuse service to sanctioned jurisdictions</li>
                <li>Cancel bookings violating export regulations</li>
              </ul>
            </motion.section>

            {/* 9. Suspension & Termination */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className={sectionClass}>
              <h2 className={h2Class}>
                <Ban className="h-6 w-6 text-coke-red" />
                9. Suspension &amp; Termination
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                CourierX™ may suspend or permanently terminate accounts for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>False declaration</li>
                <li>Failed KYC</li>
                <li>Prohibited goods attempts</li>
                <li>Chargeback abuse</li>
                <li>Customs violations</li>
                <li>Threatening conduct</li>
              </ul>
            </motion.section>

            {/* 10. Force Majeure */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className={sectionClass}>
              <h2 className={h2Class}>
                <AlertTriangle className="h-6 w-6 text-coke-red" />
                10. Force Majeure
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                CourierX™ shall not be liable for delays caused by:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Government action</li>
                <li>Customs detention</li>
                <li>Natural disasters</li>
                <li>War</li>
                <li>Regulatory changes</li>
                <li>Carrier strikes</li>
              </ul>
            </motion.section>

            {/* 11. Dispute Resolution */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-coke-red/5 border border-coke-red/20 rounded-2xl p-8">
              <h2 className={h2Class}>
                <Gavel className="h-6 w-6 text-coke-red" />
                11. Dispute Resolution
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Governing law: Orissa, India. All disputes shall be resolved through binding arbitration in Cuttack under the Arbitration &amp; Conciliation Act, 1996.
              </p>
            </motion.section>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
};

export default TermsAndConditions;

