"use client"

import * as React from "react"
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Package,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Info,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import {
  type LoanProduct,
  type TenureUnit,
  getLoanProducts,
  createLoanProduct,
  updateLoanProduct,
  deleteLoanProduct,
  resetLoanProducts,
  formatTenure,
} from "@/lib/loan-products"

type ProductFormData = Omit<LoanProduct, "id" | "createdAt" | "updatedAt">

const emptyFormData: ProductFormData = {
  name: "",
  description: "",
  interestRate: 1,
  interestType: "reducing",
  maxAmount: null,
  maxMultiplier: 3,
  minTenure: 1,
  maxTenure: 12,
  tenureUnit: "months",
  guarantorsRequired: 3,
  processingFee: 1,
  insuranceFee: 0.5,
  isActive: true,
}

export default function AdminProductsPage() {
  const [products, setProducts] = React.useState<LoanProduct[]>([])
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<LoanProduct | null>(null)
  const [deletingProduct, setDeletingProduct] = React.useState<LoanProduct | null>(null)
  const [formData, setFormData] = React.useState<ProductFormData>(emptyFormData)
  const [useMultiplier, setUseMultiplier] = React.useState(true)

  // Load products on mount
  React.useEffect(() => {
    setProducts(getLoanProducts())
  }, [])

  const handleOpenCreate = () => {
    setEditingProduct(null)
    setFormData(emptyFormData)
    setUseMultiplier(true)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (product: LoanProduct) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      interestRate: product.interestRate,
      interestType: product.interestType,
      maxAmount: product.maxAmount,
      maxMultiplier: product.maxMultiplier,
      minTenure: product.minTenure,
      maxTenure: product.maxTenure,
      tenureUnit: product.tenureUnit,
      guarantorsRequired: product.guarantorsRequired,
      processingFee: product.processingFee,
      insuranceFee: product.insuranceFee,
      isActive: product.isActive,
    })
    setUseMultiplier(product.maxMultiplier !== null)
    setIsDialogOpen(true)
  }

  const handleOpenDelete = (product: LoanProduct) => {
    setDeletingProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      maxAmount: useMultiplier ? null : formData.maxAmount,
      maxMultiplier: useMultiplier ? formData.maxMultiplier : null,
    }

    if (editingProduct) {
      updateLoanProduct(editingProduct.id, dataToSave)
    } else {
      createLoanProduct(dataToSave)
    }

    setProducts(getLoanProducts())
    setIsDialogOpen(false)
  }

  const handleDelete = () => {
    if (deletingProduct) {
      deleteLoanProduct(deletingProduct.id)
      setProducts(getLoanProducts())
    }
    setIsDeleteDialogOpen(false)
    setDeletingProduct(null)
  }

  const handleToggleActive = (product: LoanProduct) => {
    updateLoanProduct(product.id, { isActive: !product.isActive })
    setProducts(getLoanProducts())
  }

  const handleReset = () => {
    resetLoanProducts()
    setProducts(getLoanProducts())
    setIsResetDialogOpen(false)
  }

  const formatInterestRate = (product: LoanProduct) => {
    if (product.interestType === "flat") {
      return `${product.interestRate}% flat`
    }
    return `${product.interestRate}% p.m. reducing`
  }

  const formatMaxAmount = (product: LoanProduct) => {
    if (product.maxMultiplier !== null) {
      return `${product.maxMultiplier}x BOSA`
    }
    if (product.maxAmount !== null) {
      return `KES ${product.maxAmount.toLocaleString()}`
    }
    return "Unlimited"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Products</h1>
          <p className="text-muted-foreground">
            Configure loan products, interest rates, and tenure options
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsResetDialogOpen(true)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="mt-0.5 h-5 w-5 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-primary">Product Configuration</p>
            <p className="text-muted-foreground">
              Changes made here will be reflected in the public loan calculator and member loan application forms.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Configured Products
          </CardTitle>
          <CardDescription>
            {products.length} product{products.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="hidden md:table-cell">Interest Rate</TableHead>
                  <TableHead className="hidden lg:table-cell">Max Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Tenure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No loan products configured. Click &quot;Add Product&quot; to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {product.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="font-mono">
                          {formatInterestRate(product)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatMaxAmount(product)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">
                          {formatTenure(product.minTenure, product.tenureUnit)} -{" "}
                          {formatTenure(product.maxTenure, product.tenureUnit)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Switch
                                  checked={product.isActive}
                                  onCheckedChange={() => handleToggleActive(product)}
                                  aria-label="Toggle product status"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {product.isActive ? "Active - visible to members" : "Inactive - hidden from members"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(product)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenDelete(product)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Loan Product" : "Create Loan Product"}
            </DialogTitle>
            <DialogDescription>
              Configure the loan product parameters. Changes will be reflected in the loan calculator.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Development Loan"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the loan product"
                  rows={2}
                />
              </div>
            </div>

            {/* Interest Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Interest Configuration</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.interestRate}
                    onChange={(e) =>
                      setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interestType">Interest Type</Label>
                  <Select
                    value={formData.interestType}
                    onValueChange={(value: "flat" | "reducing") =>
                      setFormData({ ...formData, interestType: value })
                    }
                  >
                    <SelectTrigger id="interestType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Rate (one-time)</SelectItem>
                      <SelectItem value="reducing">Reducing Balance (monthly)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Loan Amount Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Maximum Loan Amount</h4>
                <div className="flex items-center gap-2">
                  <Label htmlFor="useMultiplier" className="text-xs text-muted-foreground">
                    Use BOSA multiplier
                  </Label>
                  <Switch
                    id="useMultiplier"
                    checked={useMultiplier}
                    onCheckedChange={setUseMultiplier}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {useMultiplier ? (
                  <div className="grid gap-2">
                    <Label htmlFor="maxMultiplier">BOSA Multiplier</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="maxMultiplier"
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={formData.maxMultiplier || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, maxMultiplier: parseFloat(e.target.value) || 1 })
                        }
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">x BOSA</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="maxAmount">Maximum Amount (KES)</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.maxAmount || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, maxAmount: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tenure Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Tenure Configuration</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="tenureUnit">Tenure Unit</Label>
                  <Select
                    value={formData.tenureUnit}
                    onValueChange={(value: TenureUnit) =>
                      setFormData({ ...formData, tenureUnit: value })
                    }
                  >
                    <SelectTrigger id="tenureUnit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minTenure">Minimum Tenure</Label>
                  <Input
                    id="minTenure"
                    type="number"
                    min="1"
                    value={formData.minTenure}
                    onChange={(e) =>
                      setFormData({ ...formData, minTenure: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxTenure">Maximum Tenure</Label>
                  <Input
                    id="maxTenure"
                    type="number"
                    min="1"
                    value={formData.maxTenure}
                    onChange={(e) =>
                      setFormData({ ...formData, maxTenure: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Additional Settings</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="guarantorsRequired">Guarantors Required</Label>
                  <Input
                    id="guarantorsRequired"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.guarantorsRequired}
                    onChange={(e) =>
                      setFormData({ ...formData, guarantorsRequired: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="processingFee">Processing Fee (%)</Label>
                  <Input
                    id="processingFee"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.processingFee}
                    onChange={(e) =>
                      setFormData({ ...formData, processingFee: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="insuranceFee">Insurance Fee (%)</Label>
                  <Input
                    id="insuranceFee"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.insuranceFee}
                    onChange={(e) =>
                      setFormData({ ...formData, insuranceFee: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="isActive" className="font-medium">
                  Product Status
                </Label>
                <p className="text-sm text-muted-foreground">
                  {formData.isActive
                    ? "Product is active and visible to members"
                    : "Product is inactive and hidden from members"}
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Loan Product
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingProduct?.name}&quot;? This action cannot be
              undone. Any existing loan applications using this product will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reset to Default Products
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all custom products and restore the default Development Loan and Jipange
              Loan products. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Reset to Defaults</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
