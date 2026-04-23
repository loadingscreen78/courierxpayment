"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle, Landmark,
} from "lucide-react";
import { CXBCApplicationData } from "@/views/cxbc/CXBCApply";
import { cn } from "@/lib/utils";

interface IFSCData {
  BANK: string;
  BRANCH: string;
  ADDRESS: string;
  CITY: string;
  STATE: string;
  MICR: string;
  IFSC: string;
  RTGS: boolean;
  NEFT: boolean;
  IMPS: boolean;
  UPI: boolean;
  SWIFT?: string;
}

const bankSchema = z.object({
  bankAccountNumber: z
    .string()
    .min(9, "Account number must be at least 9 digits")
    .max(18, "Account number must be at most 18 digits")
    .regex(/^\d+$/, "Account number must contain only digits"),
  confirmAccountNumber: z.string().min(9, "Please confirm your account number"),
  bankAccountHolderName: z.string().min(2, "Account holder name is required"),
  bankIfsc: z
    .string()
    .min(11, "IFSC code must be 11 characters")
    .max(11, "IFSC code must be 11 characters")
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC format (e.g. HDFC0001234)"),
  bankAccountType: z.enum(["savings", "current"], {
    required_error: "Please select account type",
  }),
}).refine((d) => d.bankAccountNumber === d.confirmAccountNumber, {
  message: "Account numbers do not match",
  path: ["confirmAccountNumber"],
});

type BankFormValues = z.infer<typeof bankSchema>;

interface BankDetailsStepProps {
  data: CXBCApplicationData;
  onUpdate: (data: Partial<CXBCApplicationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const BankDetailsStep = ({ data, onUpdate, onNext, onBack }: BankDetailsStepProps) => {
  const [ifscData, setIfscData] = useState<IFSCData | null>(
    data.bankIfsc && data.bankName
      ? {
          BANK: data.bankName, BRANCH: data.bankBranch || "",
          ADDRESS: data.bankAddress || "", CITY: data.bankCity || "",
          STATE: data.bankState || "", MICR: data.bankMicr || "",
          IFSC: data.bankIfsc, RTGS: true, NEFT: true, IMPS: true, UPI: true,
        }
      : null
  );
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankAccountNumber: data.bankAccountNumber || "",
      confirmAccountNumber: data.bankAccountNumber || "",
      bankAccountHolderName: data.bankAccountHolderName || "",
      bankIfsc: data.bankIfsc || "",
      bankAccountType: (data.bankAccountType as "savings" | "current") || "savings",
    },
  });

  const ifscValue = form.watch("bankIfsc");

  useEffect(() => {
    const ifsc = ifscValue?.toUpperCase().trim();
    if (!ifsc || ifsc.length !== 11) {
      setIfscData(null);
      setIfscError(null);
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIfscLoading(true);
      setIfscError(null);
      setIfscData(null);
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
        if (!res.ok) {
          setIfscError("Invalid IFSC code. Please check and try again.");
          return;
        }
        const json: IFSCData = await res.json();
        setIfscData(json);
      } catch {
        setIfscError("Could not fetch bank details. Please check your connection.");
      } finally {
        setIfscLoading(false);
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [ifscValue]);

  const onSubmit = (values: BankFormValues) => {
    onUpdate({
      bankAccountNumber: values.bankAccountNumber,
      bankAccountHolderName: values.bankAccountHolderName,
      bankIfsc: values.bankIfsc.toUpperCase(),
      bankAccountType: values.bankAccountType,
      bankName: ifscData?.BANK || "",
      bankBranch: ifscData?.BRANCH || "",
      bankAddress: ifscData?.ADDRESS || "",
      bankCity: ifscData?.CITY || "",
      bankState: ifscData?.STATE || "",
      bankMicr: ifscData?.MICR || "",
    });
    onNext();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Section: Account Details (includes IFSC) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Landmark className="h-4 w-4" />
            Account Details
          </div>

          <FormField
            control={form.control}
            name="bankAccountHolderName"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Account Holder Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Name as printed on passbook / cheque"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className={cn(
                      "font-medium tracking-wide",
                      fieldState.error && "border-red-400 focus-visible:ring-red-300"
                    )}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Must match the name on your bank account exactly</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankAccountType"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Account Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className={cn(fieldState.error && "border-red-400 focus-visible:ring-red-300")}>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="savings">Savings Account</SelectItem>
                    <SelectItem value="current">Current Account</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bankAccountNumber"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Account Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter account number"
                      inputMode="numeric"
                      maxLength={18}
                      {...field}
                      className={cn(
                        "font-mono tracking-widest",
                        fieldState.error && "border-red-400 focus-visible:ring-red-300"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmAccountNumber"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Confirm Account Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Re-enter account number"
                      inputMode="numeric"
                      maxLength={18}
                      onPaste={(e) => e.preventDefault()}
                      {...field}
                      className={cn(
                        "font-mono tracking-widest",
                        fieldState.error && "border-red-400 focus-visible:ring-red-300"
                      )}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Paste is disabled for security</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* IFSC Code — merged into Account Details */}
          <FormField
            control={form.control}
            name="bankIfsc"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>IFSC Code *</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      placeholder="e.g. HDFC0001234"
                      maxLength={11}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className={cn(
                        "font-mono tracking-widest pr-10",
                        (fieldState.error || ifscError) && "border-red-400 focus-visible:ring-red-300"
                      )}
                    />
                  </FormControl>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {ifscLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!ifscLoading && ifscData && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {!ifscLoading && ifscError && <AlertCircle className="h-4 w-4 text-red-400" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  11-character code found on your cheque book or passbook (e.g. HDFC0001234)
                </p>
                {ifscError && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {ifscError}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Auto-fetched Bank Details Card */}
          {ifscData && (
            <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-100 border-b border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Bank details verified automatically</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Bank Name</p>
                  <p className="text-sm font-semibold text-foreground">{ifscData.BANK}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Branch</p>
                  <p className="text-sm font-semibold text-foreground">{ifscData.BRANCH}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Branch Address</p>
                  <p className="text-sm text-foreground">{ifscData.ADDRESS}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">City</p>
                  <p className="text-sm text-foreground">{ifscData.CITY}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">State</p>
                  <p className="text-sm text-foreground">{ifscData.STATE}</p>
                </div>
                {ifscData.MICR && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">MICR Code</p>
                    <p className="text-sm font-mono text-foreground">{ifscData.MICR}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Supported Transfers</p>
                  <div className="flex gap-1.5 flex-wrap mt-0.5">
                    {ifscData.NEFT && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">NEFT</span>}
                    {ifscData.RTGS && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">RTGS</span>}
                    {ifscData.IMPS && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">IMPS</span>}
                    {ifscData.UPI && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">UPI</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {ifscLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching bank details...
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={!ifscData}>
            Continue to Documents
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {!ifscData && (
          <p className="text-xs text-center text-muted-foreground -mt-2">
            Please enter a valid IFSC code to continue
          </p>
        )}
      </form>
    </Form>
  );
};
