"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Download, FileText, HelpCircle, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"

const eligibilityCriteria = [
  { text: "Be a Kenyan citizen or legal resident", checked: true },
  { text: "Be at least 18 years of age", checked: true },
  { text: "Have a valid National ID or Passport", checked: true },
  { text: "Be gainfully employed or self-employed", checked: true },
  { text: "Commit to regular monthly savings", checked: true },
  { text: "Pay the registration fee (KES 1,000)", checked: true },
  { text: "No outstanding debts with other SACCOs", checked: true },
]

const requiredDocuments = [
  "Copy of National ID (both sides)",
  "Recent passport-size photograph",
  "Proof of income (payslip or bank statement)",
  "KRA PIN certificate",
  "Completed membership form",
  "Next of kin details",
]

const downloadableForms = [
  { name: "Membership Application Form", size: "245 KB", type: "PDF" },
  { name: "Loan Application Form", size: "180 KB", type: "PDF" },
]

const faqs = [
  {
    question: "How long does the membership process take?",
    answer: "The membership process typically takes 3-5 working days after submitting all required documents. Once approved, you'll receive your member number and can start saving immediately."
  },
  {
    question: "What is the minimum monthly savings?",
    answer: "The minimum monthly contribution is KES 1,000 for BOSA (shares) and KES 500 for FOSA (savings). You can choose to save more based on your financial capacity."
  },
  {
    question: "Can I withdraw my shares?",
    answer: "BOSA shares can only be withdrawn upon cessation of membership. However, FOSA savings can be withdrawn at any time subject to maintaining the minimum balance of KES 500."
  },
  {
    question: "How do I qualify for a loan?",
    answer: "You need to be a member for at least 3 months, have consistent savings, and your loan amount is typically up to 3 times your BOSA share balance depending on the loan product."
  },
  {
    question: "Are my deposits insured?",
    answer: "Yes, all deposits are insured by the Kenya Deposit Insurance Corporation (KDIC) up to KES 500,000 per depositor."
  },
  {
    question: "Can I be a member if I'm self-employed?",
    answer: "Yes, self-employed individuals are welcome. You'll need to provide bank statements showing regular income or business registration documents."
  },
  {
    question: "What happens to my savings if I leave the SACCO?",
    answer: "You can withdraw all your FOSA savings immediately. BOSA shares will be refunded after deducting any outstanding loans, pending your account clearance which takes about 60 days."
  },
  {
    question: "Is there an age limit for membership?",
    answer: "Members must be at least 18 years old. There is no upper age limit, and we welcome senior citizens who wish to save with us."
  },
]

const membershipSteps = [
  {
    step: 1,
    title: "Download & Fill Forms",
    description: "Download the membership application form and fill it with accurate information."
  },
  {
    step: 2,
    title: "Gather Documents",
    description: "Collect all required documents including your ID, photo, and proof of income."
  },
  {
    step: 3,
    title: "Submit Application",
    description: "Submit your completed form and documents at any of our branches or online."
  },
  {
    step: 4,
    title: "Verification",
    description: "Our team will verify your documents and conduct the KYC process."
  },
  {
    step: 5,
    title: "Approval & Payment",
    description: "Once approved, pay the registration fee and initial deposit."
  },
  {
    step: 6,
    title: "Welcome to BEBA SACCO",
    description: "Receive your member number and start enjoying our services."
  },
]

export default function MembershipPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Become a Member</h1>
              <p className="text-lg text-muted-foreground">
                Join our community of over 2,000 members and start your journey towards financial freedom.
              </p>
            </div>
          </div>
        </section>

        {/* Eligibility Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Eligibility Criteria */}
              <div>
                <h2 className="mb-6 text-2xl font-bold">Eligibility Criteria</h2>
                <Card>
                  <CardContent className="pt-6">
                    <ul className="space-y-4">
                      {eligibilityCriteria.map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                            <Check className="h-4 w-4 text-success" />
                          </div>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Required Documents */}
              <div>
                <h2 className="mb-6 text-2xl font-bold">Required Documents</h2>
                <Card>
                  <CardContent className="pt-6">
                    <ul className="space-y-4">
                      {requiredDocuments.map((doc, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <FileText className="h-5 w-5 shrink-0 text-primary" />
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Process Steps */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Membership Process</h2>
              <p className="text-muted-foreground">
                Follow these simple steps to become a member
              </p>
            </div>
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {membershipSteps.map((step) => (
                  <Card key={step.step} className="relative">
                    <CardHeader>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        {step.step}
                      </div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {step.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Download Forms */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <div className="mb-8 text-center">
                <h2 className="mb-4 text-3xl font-bold">Download Forms</h2>
                <p className="text-muted-foreground">
                  Get all the forms you need to start your membership application
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {downloadableForms.map((form) => (
                  <Card key={form.name} className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                          <FileText className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{form.name}</p>
                          <p className="text-sm text-muted-foreground">{form.type} • {form.size}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <div className="mb-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <HelpCircle className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h2 className="mb-4 text-3xl font-bold">Frequently Asked Questions</h2>
                <p className="text-muted-foreground">
                  Find answers to common questions about membership
                </p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Card className="mx-auto max-w-3xl bg-primary text-primary-foreground">
              <CardContent className="p-8 text-center md:p-12">
                <h2 className="mb-4 text-2xl font-bold md:text-3xl">Ready to Get Started?</h2>
                <p className="mb-6 opacity-90">
                  Join BEBA SACCO today and take the first step towards achieving your financial goals.
                </p>
                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                  <Button size="lg" variant="secondary" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Application Form
                  </Button>
                  <Link href="/contact">
                    <Button size="lg" variant="outline" className="w-full border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto">
                      Visit a Branch
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
