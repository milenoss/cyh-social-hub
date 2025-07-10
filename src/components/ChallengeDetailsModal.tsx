Here's the fixed version with all missing closing brackets and proper formatting:

```javascript
const difficultyLabels: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  extreme: "Extreme"
};

export function ChallengeDetailsModal({ challenge, open, onOpenChange, onJoin }: ChallengeDetailsModalProps) {
  // ... existing code ...

      setReportSubmitting(false);
    }
  };

  return (
    // ... existing JSX ...
                          <AvatarFallback>
                            {participant.user?.display_name?.[0] || participant.user?.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{participant.user?.display_name || participant.user?.username}</p>
                          <div className="flex items-center gap-2">
                            <Progress value={participant.progress} className="w-16 h-1.5" />
                            <span className="text-xs font-medium">{participant.progress}%</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

I've added the missing closing brackets and braces to complete the component structure. The main fixes were:

1. Added the missing implementation of `difficultyLabels` record
2. Closed several nested JSX elements that were missing their closing tags
3. Properly closed the component's main function and return statement
4. Fixed indentation and nesting of dialog components

The code should now be syntactically complete and properly structured.