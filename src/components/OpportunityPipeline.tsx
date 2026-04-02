import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResponsiveDialog } from '@/components/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, CalendarPlus, Plus, TrendingUp, DollarSign, Target, Users, Megaphone, Presentation, Edit, Trash2 } from 'lucide-react';
import { addToCalendar } from '@/utils/calendarUtils';
import { Opportunity } from '@/types/tracking';

interface OpportunityPipelineProps {
  opportunities: Opportunity[];
  selectedMonth: string;
  onCreateOpportunity: (opportunity: Partial<Opportunity>) => void;
  onUpdateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  onDeleteOpportunity: (id: string) => void;
}

const OPPORTUNITY_TYPES = [
  { value: 'workshop', label: 'Workshop', icon: Users, color: 'bg-blue-600' },
  { value: 'advisory', label: 'Advisory', icon: Target, color: 'bg-emerald-600' },
  { value: 'lecture', label: 'Lecture', icon: Presentation, color: 'bg-primary' },
  { value: 'pr', label: 'PR/Content', icon: Megaphone, color: 'bg-amber-600' },
];

const STAGES = [
  { value: 'lead', label: 'Lead', probability: 10, color: 'bg-slate-500' },
  { value: 'qualified', label: 'Qualified', probability: 25, color: 'bg-amber-500' },
  { value: 'proposal', label: 'Proposal', probability: 50, color: 'bg-blue-500' },
  { value: 'negotiation', label: 'Negotiation', probability: 75, color: 'bg-primary' },
  { value: 'won', label: 'Won', probability: 100, color: 'bg-emerald-500' },
  { value: 'lost', label: 'Lost', probability: 0, color: 'bg-red-500' },
];

export const OpportunityPipeline = ({ 
  opportunities, 
  selectedMonth, 
  onCreateOpportunity, 
  onUpdateOpportunity, 
  onDeleteOpportunity 
}: OpportunityPipelineProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [newOpportunity, setNewOpportunity] = useState<Partial<Opportunity>>({
    type: 'workshop',
    stage: 'lead',
    probability: 10,
    estimated_value: 0,
    month: selectedMonth
  });
  const [selectedDate, setSelectedDate] = useState<Date>();

  const handleCreateOpportunity = () => {
    if (newOpportunity.title && newOpportunity.type) {
      onCreateOpportunity({
        ...newOpportunity,
        estimated_close_date: selectedDate?.toISOString().slice(0, 10),
        month: selectedMonth
      });
      setNewOpportunity({
        type: 'workshop',
        stage: 'lead',
        probability: 10,
        estimated_value: 0,
        month: selectedMonth
      });
      setSelectedDate(undefined);
      setIsCreateDialogOpen(false);
    }
  };

  const getStageInfo = (stage: string) => STAGES.find(s => s.value === stage) || STAGES[0];
  const getTypeInfo = (type: string) => OPPORTUNITY_TYPES.find(t => t.value === type) || OPPORTUNITY_TYPES[0];

  // Group opportunities by type
  const opportunitiesByType = OPPORTUNITY_TYPES.reduce((acc, type) => {
    acc[type.value] = opportunities.filter(opp => opp.type === type.value);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  // Calculate pipeline stats
  const pipelineStats = {
    totalOpportunities: opportunities.length,
    totalValue: opportunities.reduce((sum, opp) => sum + opp.estimated_value, 0),
    weightedValue: opportunities.reduce((sum, opp) => sum + (opp.estimated_value * opp.probability / 100), 0),
    averageProbability: opportunities.length > 0 ? opportunities.reduce((sum, opp) => sum + opp.probability, 0) / opportunities.length : 0,
  };

  const FormContent = () => (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="type">Type</Label>
        <Select value={newOpportunity.type} onValueChange={(value) => setNewOpportunity(prev => ({ ...prev, type: value as any }))}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {OPPORTUNITY_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          value={newOpportunity.title || ''}
          onChange={(e) => setNewOpportunity(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g., Leadership Workshop for Tech Corp"
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="company">Company</Label>
        <Input
          value={newOpportunity.company || ''}
          onChange={(e) => setNewOpportunity(prev => ({ ...prev, company: e.target.value }))}
          placeholder="Company name"
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="estimated_value">Estimated Value ($)</Label>
        <Input
          type="number"
          value={newOpportunity.estimated_value || 0}
          onChange={(e) => setNewOpportunity(prev => ({ ...prev, estimated_value: Number(e.target.value) }))}
          placeholder="5000"
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label>Estimated Close Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal h-11",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          value={newOpportunity.notes || ''}
          onChange={(e) => setNewOpportunity(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional details..."
          className="min-h-[80px]"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Pipeline Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs md:text-sm font-medium text-foreground-secondary">Opportunities</CardTitle>
            <Target className="h-4 w-4 text-foreground-muted" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl md:text-2xl font-bold">{pipelineStats.totalOpportunities}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs md:text-sm font-medium text-foreground-secondary">Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-foreground-muted" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl md:text-2xl font-bold">${pipelineStats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs md:text-sm font-medium text-foreground-secondary">Weighted</CardTitle>
            <TrendingUp className="h-4 w-4 text-foreground-muted" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl md:text-2xl font-bold">${pipelineStats.weightedValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs md:text-sm font-medium text-foreground-secondary">Avg. Prob.</CardTitle>
            <Target className="h-4 w-4 text-foreground-muted" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl md:text-2xl font-bold">{pipelineStats.averageProbability.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Create Opportunity - ResponsiveDialog */}
      <ResponsiveDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        trigger={
          <Button className="mb-4 h-11 touch-target btn-touch">
            <Plus className="mr-2 h-4 w-4" />
            Add Opportunity
          </Button>
        }
        title="Create New Opportunity"
        description="Add a new business opportunity to your pipeline."
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 h-11">
              Cancel
            </Button>
            <Button onClick={handleCreateOpportunity} className="flex-1 h-11">
              Create
            </Button>
          </div>
        }
      >
        <FormContent />
      </ResponsiveDialog>

      {/* Pipeline by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {OPPORTUNITY_TYPES.map(type => {
          const typeOpportunities = opportunitiesByType[type.value] || [];
          const typeValue = typeOpportunities.reduce((sum, opp) => sum + opp.estimated_value, 0);
          const TypeIcon = type.icon;

          return (
            <Card key={type.value}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className={cn("p-2 rounded-lg", type.color)}>
                    <TypeIcon className="h-4 w-4 text-white" />
                  </div>
                  <span>{type.label}</span>
                  <Badge variant="secondary" className="ml-auto">{typeOpportunities.length}</Badge>
                </CardTitle>
                <CardDescription>
                  ${typeValue.toLocaleString()} pipeline value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {typeOpportunities.length === 0 ? (
                    <p className="text-sm text-foreground-muted py-4 text-center">No opportunities yet</p>
                  ) : (
                    typeOpportunities.map(opportunity => {
                      const stageInfo = getStageInfo(opportunity.stage);
                      return (
                        <div key={opportunity.id} className="border border-border rounded-lg p-3 space-y-2 hover:bg-secondary/30 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{opportunity.title}</h4>
                              {opportunity.company && (
                                <p className="text-xs text-foreground-muted truncate">{opportunity.company}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addToCalendar({
                                  title: opportunity.title,
                                  description: [
                                    opportunity.company && `Company: ${opportunity.company}`,
                                    opportunity.contact_person && `Contact: ${opportunity.contact_person}`,
                                    `Value: $${opportunity.estimated_value?.toLocaleString() || 0}`,
                                    `Stage: ${getStageInfo(opportunity.stage).label}`,
                                    opportunity.notes,
                                  ].filter(Boolean).join('\n'),
                                  startDate: opportunity.estimated_close_date
                                    ? new Date(opportunity.estimated_close_date + 'T10:00:00').toISOString()
                                    : new Date().toISOString(),
                                })}
                                className="h-8 w-8 p-0 touch-target text-primary hover:text-primary"
                                title="Add to calendar"
                              >
                                <CalendarPlus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingOpportunity(opportunity)}
                                className="h-8 w-8 p-0 touch-target"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteOpportunity(opportunity.id!)}
                                className="h-8 w-8 p-0 touch-target text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <Badge className={cn("text-white text-xs", stageInfo.color)}>
                              {stageInfo.label}
                            </Badge>
                            <span className="text-sm font-semibold">
                              ${opportunity.estimated_value.toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-foreground-muted">
                              <span>Probability</span>
                              <span>{opportunity.probability}%</span>
                            </div>
                            <Progress value={opportunity.probability} className="h-1.5" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
