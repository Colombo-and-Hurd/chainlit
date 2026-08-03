import { ChevronDown, ChevronUp, Sparkles, Wand2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface InstructionsPlaygroundProps {
  goalDescription: string;
  onGoalChange: (value: string) => void;
  instructions: string;
  onInstructionsChange: (value: string) => void;
  instructionSummary: string;
  refineRequest: string;
  onRefineRequestChange: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onRefine: () => void;
}

export function InstructionsPlayground({
  goalDescription,
  onGoalChange,
  instructions,
  onInstructionsChange,
  instructionSummary,
  refineRequest,
  onRefineRequestChange,
  isGenerating,
  onGenerate,
  onRefine
}: InstructionsPlaygroundProps) {
  const [showDetails, setShowDetails] = useState(false);
  const hasInstructions = Boolean(instructions.trim());

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gpt-goal" className="text-sm font-medium">
          In plain English, what should this agent do?
        </Label>
        <Textarea
          id="gpt-goal"
          value={goalDescription}
          onChange={(event) => onGoalChange(event.target.value)}
          rows={4}
          className="min-h-[110px] text-base leading-relaxed"
          placeholder="Example: Answer questions using my rent agreement. Summarize key terms like rent, deposit, and notice period in plain English. Do not give legal advice."
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onGenerate} disabled={isGenerating} size="lg">
          <Wand2 className="mr-2 h-4 w-4" />
          {isGenerating
            ? 'Writing instructions...'
            : hasInstructions
              ? 'Regenerate'
              : 'Generate instructions'}
        </Button>
        {hasInstructions ? (
          <p className="text-xs text-muted-foreground">
            Preview on the right updates as you refine.
          </p>
        ) : null}
      </div>

      {hasInstructions ? (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Ready to use</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {instructionSummary ||
                  'Merlin drafted the detailed instructions. Try a sample question on the right, then save.'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? (
              <ChevronUp className="mr-1 h-4 w-4" />
            ) : (
              <ChevronDown className="mr-1 h-4 w-4" />
            )}
            {showDetails ? 'Hide details' : 'Review / edit details'}
          </Button>

          {showDetails ? (
            <div className="space-y-3 border-t border-primary/10 pt-3">
              <div className="space-y-2">
                <Label htmlFor="gpt-instructions">Full instructions</Label>
                <Textarea
                  id="gpt-instructions"
                  value={instructions}
                  onChange={(event) => onInstructionsChange(event.target.value)}
                  rows={14}
                  className="font-mono text-xs leading-relaxed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-refine">Ask Merlin to adjust</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="gpt-refine"
                    value={refineRequest}
                    onChange={(event) =>
                      onRefineRequestChange(event.target.value)
                    }
                    placeholder="Make it shorter and more formal"
                  />
                  <Button
                    variant="outline"
                    onClick={onRefine}
                    disabled={isGenerating}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Write a short description above, then click{' '}
          <span className="font-medium text-foreground">
            Generate instructions
          </span>
          . Merlin will draft the agent for you.
        </div>
      )}
    </div>
  );
}
