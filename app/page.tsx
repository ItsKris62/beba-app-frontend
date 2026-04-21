"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Shield, TrendingUp, Wallet, PiggyBank, ChevronLeft, ChevronRight, Star, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"

const features = [
  {
    icon: PiggyBank,
    title: "FOSA Savings",
    description: "Flexible savings accounts with competitive interest rates and instant access to your funds.",
  },
  {
    icon: Wallet,
    title: "Affordable Loans",
    description: "Access short term Jipange loans at competitive rates.",
  },
  {
    icon: TrendingUp,
    title: "Dividends",
    description: "Earn annual dividends on your shares. Enjoy 10% returns annually.",
  },
]

const testimonials = [
  {
    name: "Mary Wanjiku",
    role: "Teacher, Nairobi",
    content: "BEBA SACCO helped me build my dream home. The loan process was smooth and the rates unbeatable.",
    rating: 5,
  },
  {
    name: "John Kamau",
    role: "Business Owner, Mombasa",
    content: "I've been a member for 10 years. The dividends have consistently helped grow my savings.",
    rating: 5,
  },
  {
    name: "Grace Adhiambo",
    role: "Nurse, Kisumu",
    content: "The mobile app makes it so easy to manage my account. Best financial decision I ever made.",
    rating: 5,
  },
]

const stats = [
  { value: "2,000+", label: "Active Members" },
  { value: "10%", label: "Dividend Rate" },
  { value: "5", label: "Years of Service" },
]

export default function HomePage() {
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0)

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-20 md:py-32">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center rounded-full border bg-background/80 px-4 py-1.5 text-sm backdrop-blur">
                <Shield className="mr-2 h-4 w-4 text-primary" />
                Regulated by SASRA | Licensed Deposit Taking SACCO
              </div>
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-balance md:text-6xl">
                Your Path to{" "}
                <span className="text-primary">Financial Freedom</span>{" "}
                Starts Here
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground text-pretty">
                Join thousands of members enjoying better dividends, instant loans, and secure savings with Kenya&apos;s most trusted SACCO.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/membership">
                  <Button size="lg" className="w-full gap-2 sm:w-auto">
                    Join SACCO Now
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Member Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y bg-card py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Why Choose KC Boda Sacco?</h2>
              <p className="text-muted-foreground">
                We offer comprehensive financial solutions designed to help you achieve your goals.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="relative overflow-hidden transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                    <Link
                      href="/products"
                      className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                    >
                      Learn more
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">How to Get Started</h2>
              <p className="text-muted-foreground">
                Joining KC Boda Sacco is simple and straightforward.
              </p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
              {[
                { step: "1", title: "Apply Online", desc: "Fill out our simple membership form" },
                { step: "2", title: "Get Verified", desc: "Submit your documents for KYC verification" },
                { step: "3", title: "Start Saving", desc: "Make your first deposit and start earning" },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mb-2 font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">What Our Members Say</h2>
              <p className="text-muted-foreground">
                Hear from our satisfied members about their experience.
              </p>
            </div>
            <div className="relative mx-auto max-w-2xl">
              <Card className="border-2">
                <CardContent className="p-8">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: testimonials[currentTestimonial].rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-warning text-warning" />
                    ))}
                  </div>
                  <blockquote className="mb-6 text-lg italic">
                    &ldquo;{testimonials[currentTestimonial].content}&rdquo;
                  </blockquote>
                  <div>
                    <div className="font-semibold">{testimonials[currentTestimonial].name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonials[currentTestimonial].role}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="outline" size="icon" onClick={prevTestimonial}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {testimonials.map((_, i) => (
                  <Button
                    key={i}
                    variant={i === currentTestimonial ? "default" : "outline"}
                    size="icon"
                    className="h-3 w-3 rounded-full p-0"
                    onClick={() => setCurrentTestimonial(i)}
                  />
                ))}
                <Button variant="outline" size="icon" onClick={nextTestimonial}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-20 text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Start Your Financial Journey?</h2>
            <p className="mx-auto mb-8 max-w-2xl opacity-90">
              Join over 2,000 members who are building their wealth with KC Boda Sacco.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/membership">
                <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto">
                  Become a Member
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 sm:w-auto"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Eligibility Quick Check */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Membership Eligibility</CardTitle>
                  <CardDescription>
                    Check if you qualify to join KC Boda Sacco
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {[
                      "Kenyan citizen or resident",
                      "Employed or self-employed",
                      "Valid national ID or passport",
                      "Minimum age of 18 years",
                      "Willing to save regularly",
                      "No outstanding SACCO debts",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                          <Check className="h-4 w-4 text-success" />
                        </div>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 text-center">
                    <Link href="/membership">
                      <Button>Apply for Membership</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
