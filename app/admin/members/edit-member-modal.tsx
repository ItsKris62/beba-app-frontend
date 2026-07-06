import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { AdminMember, KycDocument } from '@/lib/api-client';
import { Loader2, Upload, FileCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EditMemberModalProps {
  member: AdminMember | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditMemberModal({ member, open, onClose, onSuccess }: EditMemberModalProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    phone: '',
    nationalId: '',
    kraPin: '',
    employer: '',
    occupation: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    if (member && open) {
      setProfileForm({
        phone: member.user.phone || '',
        nationalId: member.nationalId || '',
        kraPin: member.kraPin || '',
        employer: member.employer || '',
        occupation: member.occupation || '',
        dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
      });
      setActiveTab('profile');
      loadDocuments(member.id);
    }
  }, [member, open]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setLoading(true);
    try {
      const res = await adminApi.updateKyc(member.id, profileForm);
      if (res.success) {
        toast.success('Member profile updated successfully.');
        onSuccess();
      } else {
        toast.error(res.error?.message ?? 'Failed to update profile.');
      }
    } catch (err: unknown) {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Documents State
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState('NATIONAL_ID_FRONT');

  const docTypes = [
    { value: 'NATIONAL_ID_FRONT', label: 'National ID (Front)' },
    { value: 'NATIONAL_ID_BACK', label: 'National ID (Back)' },
    { value: 'KRA_PIN', label: 'KRA PIN Certificate' },
    { value: 'MEMBER_FORM', label: 'Signed Member Form' },
    { value: 'PASSPORT_PHOTO', label: 'Passport Photo' },
    { value: 'OTHER', label: 'Other Document' },
  ];

  const loadDocuments = async (memberId: string) => {
    setDocLoading(true);
    try {
      const res = await adminApi.listKycDocuments({ memberId });
      if (res.success) {
        setDocuments(res.data);
      }
    } finally {
      setDocLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximum file size is 5MB.');
      return;
    }

    setUploading(true);
    try {
      // 1. Request upload URL
      const reqRes = await adminApi.requestUploadUrl({
        memberId: member.id,
        type: uploadDocType,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        originalFileName: file.name,
      });

      if (!reqRes.success || !reqRes.data) {
        throw new Error(reqRes.error?.message || 'Failed to request upload URL');
      }

      const { uploadUrl, documentId } = reqRes.data;

      // 2. Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // 3. Confirm upload
      const confirmRes = await adminApi.confirmUpload({
        documentId,
        memberId: member.id,
      });

      if (!confirmRes.success) {
        throw new Error(confirmRes.error?.message || 'Failed to confirm upload');
      }

      toast.success('Document has been uploaded for the member.');
      loadDocuments(member.id);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'An unexpected error occurred.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member Profile</DialogTitle>
          <DialogDescription>
            {member ? `${member.user.firstName} ${member.user.lastName} (${member.memberNumber})` : ''}
          </DialogDescription>
        </DialogHeader>

        {member && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile Details</TabsTrigger>
              <TabsTrigger value="documents">KYC Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="pt-4 space-y-4">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="07XXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>National ID</Label>
                    <Input
                      value={profileForm.nationalId}
                      onChange={(e) => setProfileForm({ ...profileForm, nationalId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>KRA PIN</Label>
                    <Input
                      value={profileForm.kraPin}
                      onChange={(e) => setProfileForm({ ...profileForm, kraPin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Employer</Label>
                    <Input
                      value={profileForm.employer}
                      onChange={(e) => setProfileForm({ ...profileForm, employer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Occupation</Label>
                    <Input
                      value={profileForm.occupation}
                      onChange={(e) => setProfileForm({ ...profileForm, occupation: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="documents" className="pt-4 space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg border flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Document Type</Label>
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {docTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileSelect}
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Document
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Uploaded Documents</h3>
                {docLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
                ) : (
                  <div className="grid gap-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded">
                            <FileCheck className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{docTypes.find(t => t.value === doc.type)?.label || doc.type}</p>
                            <p className="text-xs text-muted-foreground">{doc.originalFileName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            doc.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            doc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
