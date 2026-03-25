import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Check, Mail, FileSpreadsheet,
  Users, Briefcase, TrendingUp, Target, Clock
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';

interface GoogleSheetsExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPORT_ITEMS = [
  { icon: Users, label: 'Contacts & Network', description: 'Names, emails, phones, skills, rates' },
  { icon: Briefcase, label: 'Clients', description: 'Status, engagement, revenue targets' },
  { icon: TrendingUp, label: 'Revenue', description: 'Monthly revenue by source' },
  { icon: Target, label: 'Pipeline', description: 'Opportunities, stages, values' },
  { icon: Clock, label: 'Activity Log', description: 'Logged activities and notes' },
];

export const GoogleSheetsExportSheet = ({ open, onOpenChange }: GoogleSheetsExportSheetProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  const handleExport = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsExporting(true);
    haptics.light();

    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: {
          action: 'export_crm',
          email: email.trim(),
        },
      });

      if (error) throw error;

      setSheetUrl(data?.sheet_url || null);
      setShowSuccess(true);
      haptics.success();
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
      haptics.error();
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setTimeout(() => {
        setShowSuccess(false);
        setSheetUrl(null);
      }, 300);
    }
    onOpenChange(isOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border max-h-[85dvh]">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 px-6"
            >
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">Export started</p>
              <p className="text-caption text-foreground-secondary text-center max-w-[260px]">
                We'll email you at <span className="text-foreground font-medium">{email}</span> with a link to your CRM spreadsheet.
              </p>
              {sheetUrl && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.open(sheetUrl, '_blank')}
                >
                  Open Spreadsheet
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-y-auto overscroll-contain"
            >
              <DrawerHeader className="pb-1 pt-2">
                <DrawerTitle className="text-foreground text-xl flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  Export to Google Sheets
                </DrawerTitle>
                <p className="text-caption text-foreground-secondary">
                  Get a beautifully formatted CRM spreadsheet with all your data.
                </p>
              </DrawerHeader>

              <div className="px-4 pb-2 space-y-4">
                {/* What's included */}
                <div className="space-y-1.5">
                  <p className="text-caption-bold text-foreground-secondary uppercase tracking-wider">
                    What's included
                  </p>
                  <div className="rounded-xl bg-background-elevated border border-border overflow-hidden">
                    {EXPORT_ITEMS.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            i < EXPORT_ITEMS.length - 1 ? 'border-b border-border' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-bold text-foreground text-sm">{item.label}</p>
                            <p className="text-caption text-foreground-secondary">{item.description}</p>
                          </div>
                          <Check className="w-4 h-4 text-success flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Email input */}
                <div className="space-y-1.5">
                  <p className="text-caption-bold text-foreground-secondary uppercase tracking-wider">
                    Send link to
                  </p>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    <Input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      type="email"
                      className="pl-11 bg-input border-border text-foreground text-base"
                    />
                  </div>
                </div>
              </div>

              <DrawerFooter className="pt-2">
                <Button
                  onClick={handleExport}
                  disabled={isExporting || !email.trim()}
                  className="w-full h-12 text-base font-semibold"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      Export & Email Link
                    </>
                  )}
                </Button>
              </DrawerFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
};
