import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface MobileHeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
  formatMonth: (month: string) => string;
  onSignOut: () => void;
}

export const MobileHeader = ({ 
  selectedMonth, 
  onMonthChange, 
  availableMonths, 
  formatMonth,
  onSignOut 
}: MobileHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-top">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <img 
          src="/brand/fractionl-wordmark.png" 
          alt="Fractionl.ai" 
          className="h-6"
        />
        
        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Month selector - compact */}
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-32 h-9 text-sm border-0 bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(month => (
                <SelectItem key={month} value={month}>
                  {formatMonth(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setIsOpen(false);
                    onSignOut();
                  }}
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
