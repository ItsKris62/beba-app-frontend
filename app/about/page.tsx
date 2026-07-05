"use client"

import { Award, Target, Eye, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { useTenantPublicInfo } from "@/hooks/use-tenant-public-info"

const FALLBACK_NAME = "KC Boda Sacco"

const boardMembers = [
  { name: "Dr. James Mwangi", role: "Chairman", image: "/placeholder-user.jpg" },
  { name: "Sarah Kimani", role: "Vice Chairperson", image: "/placeholder-user.jpg" },
  { name: "Peter Ochieng", role: "Secretary", image: "/placeholder-user.jpg" },
  { name: "Grace Wambui", role: "Treasurer", image: "/placeholder-user.jpg" },
  { name: "David Mutua", role: "Member", image: "/placeholder-user.jpg" },
  { name: "Lucy Akinyi", role: "Member", image: "/placeholder-user.jpg" },
]

const managementTeam = [
  { name: "Jane Mwangi", role: "Chief Executive Officer", image: "/placeholder-user.jpg" },
  { name: "Michael Otieno", role: "Finance Manager", image: "/placeholder-user.jpg" },
  { name: "Anne Njeri", role: "Credit Manager", image: "/placeholder-user.jpg" },
  { name: "Samuel Kipkorir", role: "Operations Manager", image: "/placeholder-user.jpg" },
]

const milestones = [
  { year: "2020", event: "Founded by boda boda operators in Kolwa Central Ward" },
  { year: "2021", event: "Reached 500 members milestone" },
  { year: "2022", event: "Launched FOSA operations" },
  { year: "2023", event: "Introduced Development and Jipange loans" },
  { year: "2024", event: "Crossed 1,500 active members" },
  { year: "2025", event: "Achieved 2,000+ active members" },
  { year: "2026", event: "Launched digital transformation initiative" },
]

export default function AboutPage() {
  const { info } = useTenantPublicInfo()
  const name = info?.name ?? FALLBACK_NAME

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">About {name}</h1>
              <p className="text-lg text-muted-foreground">
                Building financial futures together since 2020. We are a member-owned cooperative dedicated to providing accessible savings and credit services to boda boda operators in Kisumu.
              </p>
            </div>
          </div>
        </section>

        {/* History Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-3xl font-bold">Our Story</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    {name} was founded in 2020 by a group of boda boda operators in Kolwa Central Ward, Kisumu East Subcounty who shared a common vision: to create a financial institution that truly served their community&apos;s interests.
                  </p>
                  <p>
                    What started as a small savings group has grown into a trusted SACCO with over 2,000 active members dedicated to empowering boda boda operators.
                  </p>
                  <p>
                    Throughout our journey, we have remained committed to our founding principles of member empowerment, financial inclusion, and community development.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <div key={milestone.year} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {milestone.year.slice(2)}
                        </div>
                        {index < milestones.length - 1 && (
                          <div className="h-full w-0.5 bg-border" />
                        )}
                      </div>
                      <div className="pb-6">
                        <div className="font-semibold">{milestone.year}</div>
                        <div className="text-sm text-muted-foreground">{milestone.event}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 md:grid-cols-2">
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Our Vision</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    To be the leading SACCO in Kenya, transforming lives through innovative financial solutions and exceptional member service.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    To mobilize savings, provide affordable credit, and deliver value-added financial services that empower our members to achieve their financial goals.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Our Core Values</h2>
              <p className="text-muted-foreground">
                The principles that guide everything we do
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Users, title: "Member-Centric", desc: "Members are at the heart of all our decisions" },
                { icon: Award, title: "Integrity", desc: "We uphold the highest ethical standards" },
                { icon: Target, title: "Excellence", desc: "We strive for the best in everything we do" },
                { icon: Eye, title: "Transparency", desc: "Open and honest communication always" },
              ].map((value) => (
                <Card key={value.title} className="text-center">
                  <CardContent className="pt-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <value.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Board of Directors */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Board of Directors</h2>
              <p className="text-muted-foreground">
                Elected by members to provide strategic leadership
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {boardMembers.map((member) => (
                <Card key={member.name}>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Management Team */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Management Team</h2>
              <p className="text-muted-foreground">
                Professional team driving our day-to-day operations
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {managementTeam.map((member) => (
                <Card key={member.name} className="text-center">
                  <CardContent className="pt-6">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="bg-primary py-16 text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Our Achievements</h2>
              <p className="opacity-90">
                Recognition of our commitment to excellence
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { title: "Best SACCO 2023", org: "Kenya Financial Sector Awards" },
                { title: "Customer Excellence", org: "SASRA Recognition 2022" },
                { title: "Digital Innovation", org: "Fintech Kenya Awards 2024" },
              ].map((award) => (
                <div key={award.title} className="text-center">
                  <Award className="mx-auto mb-4 h-12 w-12" />
                  <h3 className="font-semibold">{award.title}</h3>
                  <p className="text-sm opacity-80">{award.org}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
