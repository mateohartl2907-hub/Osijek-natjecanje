"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVoting } from "@/components/providers/voting-context";

export function CreatePollModal() {
  const { connected } = useWallet();
  const { createPoll, isLoading } = useVoting();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [durationHours, setDurationHours] = useState(24);
  const [isCreating, setIsCreating] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (!question.trim() || validOptions.length < 2) return;

    setIsCreating(true);
    try {
      await createPoll(question.trim(), validOptions, durationHours);
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create poll:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setDurationHours(24);
  };

  const isValid =
    question.trim().length > 0 &&
    options.filter((opt) => opt.trim() !== "").length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={!connected}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Kreiraj glasanje
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Kreiraj novo glasanje
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Pitanje i opcije bit ce trajno zapisani na Solana blockchain.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question" className="text-foreground">
              Pitanje
            </Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Unesite pitanje za glasanje..."
              maxLength={280}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground text-right">
              {question.length}/280
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-foreground">
              Opcije (min. 2, max. 10)
            </Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Opcija ${index + 1}`}
                  maxLength={64}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                className="w-full border-dashed border-border text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj opciju
              </Button>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-foreground">
              Trajanje glasanja
            </Label>
            <select
              id="duration"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={1}>1 sat</option>
              <option value={6}>6 sati</option>
              <option value={12}>12 sati</option>
              <option value={24}>24 sata</option>
              <option value={48}>48 sati</option>
              <option value={72}>72 sata</option>
              <option value={168}>7 dana</option>
            </select>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 border-border text-muted-foreground hover:text-foreground"
            >
              Odustani
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isCreating || isLoading}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kreiram...
                </>
              ) : (
                "Kreiraj glasanje"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
