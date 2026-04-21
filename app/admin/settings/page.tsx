"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Shield,
  Bell,
  CreditCard,
  Mail,
  Globe,
  Database,
  Save,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react"
import {
  type LoanProduct,
  type TenureUnit,
  getLoanProducts,
  updateLoanProduct,
  createLoanProduct,
  deleteLoanProduct,
} from "@/lib/loan-products"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const emptyProduct: Omit<LoanProduct, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  description: "",
  interestRate: 12,
  interestType: "reducing",
  maxAmount: null,
  maxMultiplier: 3,
  minTenure: 1,
  maxTenure: 12,
  tenureUnit: "months",
  guarantorsRequired: 1,
  processingFee: 1,
  insuranceFee: 0.5,
  isActive: true,
}

export default function AdminSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(true)
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [autoLogout, setAutoLogout] = useState(true)
  
  // Loan products state
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [editingProduct, setEditingProduct] = useState<LoanProduct | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newProduct, setNewProduct] = useState(emptyProduct)
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load products on mount
  useEffect(() => {
    setProducts(getLoanProducts())
  }, [])

  const handleUpdateProduct = (id: string, field: keyof LoanProduct, value: unknown) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const handleSaveProduct = (id: string) => {
    const product = products.find((p) => p.id === id)
    if (product) {
      updateLoanProduct(id, product)
      setEditingProduct(null)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
  }

  const handleAddProduct = () => {
    const created = createLoanProduct(newProduct)
    setProducts((prev) => [...prev, created])
    setIsAddDialogOpen(false)
    setNewProduct(emptyProduct)
  }

  const handleDeleteProduct = (id: string) => {
    deleteLoanProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    setDeleteProductId(null)
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateLoanProduct(id, { isActive })
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive } : p))
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="loans">Loan Products</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Organization Settings</CardTitle>
              </div>
              <CardDescription>Basic information about your SACCO</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" defaultValue="Beba SACCO Ltd" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regNumber">Registration Number</Label>
                  <Input id="regNumber" defaultValue="CS/2024/001234" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" defaultValue="info@bebasacco.co.ke" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input id="phone" defaultValue="+254 700 123 456" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Physical Address</Label>
                <Textarea
                  id="address"
                  defaultValue="Beba House, 3rd Floor, Kimathi Street, Nairobi, Kenya"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                <CardTitle>Regional Settings</CardTitle>
              </div>
              <CardDescription>Configure regional and display preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select defaultValue="kes">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kes">KES - Kenyan Shilling</SelectItem>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="eat">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eat">East Africa Time (UTC+3)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="dmy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Security Settings</CardTitle>
              </div>
              <CardDescription>Configure security policies and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin users
                  </p>
                </div>
                <Switch checked={twoFactorAuth} onCheckedChange={setTwoFactorAuth} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Logout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out inactive sessions after 30 minutes
                  </p>
                </div>
                <Switch checked={autoLogout} onCheckedChange={setAutoLogout} />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <Label>Password Expiry (days)</Label>
                  <Input type="number" defaultValue="90" />
                </div>
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input type="number" defaultValue="5" />
                </div>
                <div className="space-y-2">
                  <Label>Lockout Duration (minutes)</Label>
                  <Input type="number" defaultValue="15" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>Define password requirements for all users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Length</Label>
                  <Input type="number" defaultValue="8" />
                </div>
                <div className="space-y-2">
                  <Label>Password History</Label>
                  <Input type="number" defaultValue="5" placeholder="Previous passwords to remember" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password Requirements</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Uppercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Lowercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Numbers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Special characters</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>Configure how notifications are sent to members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via email
                  </p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via SMS
                  </p>
                </div>
                <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
              </div>
              <Separator />
              <div className="space-y-4">
                <Label>Notification Events</Label>
                <div className="space-y-3">
                  {[
                    "Loan Application Status",
                    "Loan Disbursement",
                    "Loan Repayment Reminder",
                    "Deposit Confirmation",
                    "Withdrawal Confirmation",
                    "Statement Generation",
                    "System Maintenance",
                  ].map((event) => (
                    <div key={event} className="flex items-center justify-between py-2">
                      <span className="text-sm">{event}</span>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked />
                          <span className="text-xs text-muted-foreground">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked />
                          <span className="text-xs text-muted-foreground">SMS</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <CardTitle>Loan Product Settings</CardTitle>
                    <CardDescription>Configure loan products and interest rates</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                  <Check className="h-4 w-4" />
                  Changes saved successfully
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {products.map((product) => {
                  const isEditing = editingProduct?.id === product.id
                  return (
                    <div key={product.id} className={`p-4 rounded-lg border ${!product.isActive ? "opacity-60" : ""}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => handleSaveProduct(product.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingProduct(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setEditingProduct(product)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => setDeleteProductId(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Switch
                            checked={product.isActive}
                            onCheckedChange={(checked) => handleToggleActive(product.id, checked)}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label>Interest Rate (%)</Label>
                          <Input
                            type="number"
                            value={product.interestRate}
                            onChange={(e) => handleUpdateProduct(product.id, "interestRate", Number(e.target.value))}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Interest Type</Label>
                          <Select
                            value={product.interestType}
                            onValueChange={(value) => handleUpdateProduct(product.id, "interestType", value)}
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flat">Flat Rate</SelectItem>
                              <SelectItem value="reducing">Reducing Balance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Max Tenure</Label>
                          <Input
                            type="number"
                            value={product.maxTenure}
                            onChange={(e) => handleUpdateProduct(product.id, "maxTenure", Number(e.target.value))}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tenure Unit</Label>
                          <Select
                            value={product.tenureUnit}
                            onValueChange={(value) => handleUpdateProduct(product.id, "tenureUnit", value as TenureUnit)}
                            disabled={!isEditing}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {product.maxMultiplier !== null && (
                          <div className="space-y-2">
                            <Label>Max BOSA Multiplier</Label>
                            <Input
                              type="number"
                              value={product.maxMultiplier}
                              onChange={(e) => handleUpdateProduct(product.id, "maxMultiplier", Number(e.target.value))}
                              disabled={!isEditing}
                            />
                          </div>
                        )}
                        {product.maxAmount !== null && (
                          <div className="space-y-2">
                            <Label>Max Amount (KES)</Label>
                            <Input
                              type="number"
                              value={product.maxAmount}
                              onChange={(e) => handleUpdateProduct(product.id, "maxAmount", Number(e.target.value))}
                              disabled={!isEditing}
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Guarantors Required</Label>
                          <Input
                            type="number"
                            value={product.guarantorsRequired}
                            onChange={(e) => handleUpdateProduct(product.id, "guarantorsRequired", Number(e.target.value))}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Processing Fee (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={product.processingFee}
                            onChange={(e) => handleUpdateProduct(product.id, "processingFee", Number(e.target.value))}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                {products.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No loan products configured. Click &quot;Add Product&quot; to create one.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Product Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Loan Product</DialogTitle>
                <DialogDescription>
                  Configure the details for the new loan product
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="e.g., Emergency Loan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      value={newProduct.interestRate}
                      onChange={(e) => setNewProduct({ ...newProduct, interestRate: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Brief description of the loan product"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Interest Type</Label>
                    <Select
                      value={newProduct.interestType}
                      onValueChange={(value: "flat" | "reducing") => setNewProduct({ ...newProduct, interestType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Rate</SelectItem>
                        <SelectItem value="reducing">Reducing Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tenure</Label>
                    <Input
                      type="number"
                      value={newProduct.maxTenure}
                      onChange={(e) => setNewProduct({ ...newProduct, maxTenure: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenure Unit</Label>
                    <Select
                      value={newProduct.tenureUnit}
                      onValueChange={(value: TenureUnit) => setNewProduct({ ...newProduct, tenureUnit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Max BOSA Multiplier</Label>
                    <Input
                      type="number"
                      value={newProduct.maxMultiplier || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, maxMultiplier: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Leave empty if not applicable"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Amount (KES)</Label>
                    <Input
                      type="number"
                      value={newProduct.maxAmount || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, maxAmount: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Leave empty if not applicable"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Guarantors Required</Label>
                    <Input
                      type="number"
                      value={newProduct.guarantorsRequired}
                      onChange={(e) => setNewProduct({ ...newProduct, guarantorsRequired: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Processing Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newProduct.processingFee}
                      onChange={(e) => setNewProduct({ ...newProduct, processingFee: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Insurance Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newProduct.insuranceFee}
                      onChange={(e) => setNewProduct({ ...newProduct, insuranceFee: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProduct} disabled={!newProduct.name}>
                  Add Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Loan Product?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the loan product configuration.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteProductId && handleDeleteProduct(deleteProductId)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>Third-Party Integrations</CardTitle>
              </div>
              <CardDescription>Configure external service integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center text-primary-foreground font-bold">
                      M
                    </div>
                    <div>
                      <h4 className="font-medium">M-Pesa Integration</h4>
                      <p className="text-sm text-muted-foreground">Safaricom M-Pesa API</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Consumer Key</Label>
                    <Input type="password" defaultValue="••••••••••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumer Secret</Label>
                    <Input type="password" defaultValue="••••••••••••••••" />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-primary-foreground font-bold">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">Email Service</h4>
                      <p className="text-sm text-muted-foreground">SMTP Configuration</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input defaultValue="smtp.bebasacco.co.ke" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input defaultValue="587" />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input defaultValue="noreply@bebasacco.co.ke" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" defaultValue="••••••••••••••••" />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border opacity-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">Core Banking Integration</h4>
                      <p className="text-sm text-muted-foreground">Not configured</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
