import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CheckCircle, 
  Calendar as CalendarIcon, 
  Target, 
  TrendingUp, 
  MessageSquare,
  Plus,
  Flame,
  Award
} from "lucide-react";
import { format } from "date-fns";

interface ProgressEntry {
  id: string;
  date: string;
  completed: boolean; 
  note?: string;
  progress_percentage: number;
}

interface ProgressTrackerProps {
  challengeId: string;
  participation?: any;
  challengeTitle: string;
  duration: number;
  currentProgress: number;
  onUpdateProgress: (progress: number, note?: string) => Promise<boolean>; 
}

// Mock progress entries - in real app, this would come from the database
const mockEntries: ProgressEntry[] = [
  { id: '1', date: '2024-01-15', completed: true, note: 'Great workout session!', progress_percentage: 10 },
  { id: '2', date: '2024-01-16', completed: true, note: 'Feeling stronger already', progress_percentage: 20 },
  { id: '3', date: '2024-01-17', completed: false, note: 'Missed today, will catch up tomorrow', progress_percentage: 20 },
  { id: '4', date: '2024-01-18', completed: true, note: 'Back on track!', progress_percentage: 30 },
  { id: '5', date: '2024-01-19', completed: true, progress_percentage: 40 },
];

export function ProgressTracker({ 
  challengeId, 
  participation,
  challengeTitle, 
  duration, 
  currentProgress, 
  onUpdateProgress 
}: ProgressTrackerProps) {
  const [entries, setEntries] = useState<ProgressEntry[]>(mockEntries);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [note, setNote] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState<any[]>([]);

  // Check if user has already checked in today
  useEffect(() => {
    if (participation?.last_check_in) {
      const lastCheckIn = new Date(participation.last_check_in);
      const today = new Date();
      setTodayCheckedIn(
        lastCheckIn.getDate() === today.getDate() &&
        lastCheckIn.getMonth() === today.getMonth() &&
        lastCheckIn.getFullYear() === today.getFullYear()
      );
    } else {
      setTodayCheckedIn(false);
    }
    
    // Load check-in notes if available
    if (participation?.check_in_notes) {
      try {
        const notes = Array.isArray(participation.check_in_notes) 
          ? participation.check_in_notes 
          : JSON.parse(participation.check_in_notes);
        setCheckInNotes(notes);
      } catch (e) {
        console.error("Error parsing check-in notes:", e);
        setCheckInNotes([]);
      }
    }
  }, [participation]);

  const completedDays = entries.filter(entry => entry.completed).length;
  const currentStreak = calculateCurrentStreak(entries);
  const progressPercentage = (completedDays / duration) * 100;

  const handleCheckIn = async () => {
    setUpdating(true);
    const newProgress = Math.min(currentProgress + (100 / duration), 100);
    
    const success = await onUpdateProgress(newProgress, note);
    if (success) {
      setNote("");
      // Add new entry to local state
      const newProgress = Math.min(currentProgress + (100 / duration), 100);
      const newEntry: ProgressEntry = {
        id: Date.now().toString(),
        date: format(new Date(), 'yyyy-MM-dd'),
        completed: true,
        note: note || undefined,
        progress_percentage: newProgress
      };
      
      // Add note to check-in notes
      if (note) {
        setCheckInNotes(prev => [
          { date: new Date().toISOString(), note },
          ...prev
        ]);
      }
      setEntries(prev => [newEntry, ...prev]);
      setTodayCheckedIn(true);
    }
    
    setUpdating(false);
  };

  const todayEntry = entries.find(entry => 
    entry.date === format(new Date(), 'yyyy-MM-dd')
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {challengeTitle}
          </CardTitle>
          <CardDescription>
            Track your daily progress and stay motivated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{completedDays}</p>
              <p className="text-sm text-muted-foreground">Days Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{currentStreak}</p>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{Math.round(progressPercentage)}%</p>
              <p className="text-sm text-muted-foreground">Progress</p>
            </div>
          </div>

          <div className="space-y-2">
          {checkInNotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Check-in Notes
                </CardTitle>
                <CardDescription>
                  Your daily reflections and notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {checkInNotes.map((note, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(note.date)}
                        </span>
                        <Badge variant="outline" size="sm" className="text-xs">
                          Day {index + 1}
                        </Badge>
                      </div>
                      <p className="text-sm">{note.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {duration - completedDays} days remaining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Check-in */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" /> 
            Daily Check-in
          </CardTitle>
          <CardDescription>
            Log your progress for today
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayCheckedIn ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-600">Already checked in today!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Last check-in: {format(new Date(participation?.last_check_in || new Date()), 'MMM d, yyyy h:mm a')}
                {participation?.status === 'completed' && <span className="ml-2">• Challenge completed!</span>}
              </p>
              {participation?.status === 'completed' && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-700">Challenge completed!</span>
                </div>
                <span>Ends: {format(endDate, 'MMM d, yyyy')}</span>
              )}
            </div>
          ) : (
            <>
              <Textarea
                placeholder="How did today go? Any notes or reflections..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <Button onClick={handleCheckIn} className="w-full" size="lg">
                <CheckCircle className="h-4 w-4" />
                {updating ? "Updating..." : "Check In for Today"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Progress History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress History
              </CardTitle>
              <CardDescription>
                Your journey so far
              </CardDescription>
            </div>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4" />
                  Calendar View
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    completed: entries
                      .filter(entry => entry.completed)
                      .map(entry => new Date(entry.date))
                  }}
                  modifiersStyles={{
                    completed: { backgroundColor: 'hsl(var(--primary))', color: 'white' }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {entries
              .filter(entry => entry.progress_percentage <= currentProgress)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="mt-1">
                    {entry.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" /> 
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </p>
                      <Badge 
                        variant={entry.completed ? "default" : "secondary"}
                        className="text-xs"
                      > 
                        {entry.completed ? "Completed" : "Missed"}
                      </Badge>
                    </div>
                    {entry.note && (
                      <p className="text-sm text-muted-foreground">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateCurrentStreak(entries: ProgressEntry[]): number {
  const sortedEntries = entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let streak = 0;
  for (const entry of sortedEntries) {
    if (entry.completed) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}