'use client';

import { toast } from 'sonner';

import { ModeToggle } from '@helpme/ui/components/mode-toggle';
import { Badge } from '@helpme/ui/components/ui/badge';
import { Button } from '@helpme/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@helpme/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@helpme/ui/components/ui/dialog';
import { Input } from '@helpme/ui/components/ui/input';
import { Label } from '@helpme/ui/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@helpme/ui/components/ui/table';

const expenses = [
  { id: 1, label: 'Flights to Lisbon', category: 'Travel', amount: '£412.00' },
  { id: 2, label: 'Team dinner', category: 'Food', amount: '£86.40' },
  { id: 3, label: 'Conference ticket', category: 'Work', amount: '£250.00' },
];

/**
 * Smoke test for the design system. Every element here comes from
 * @helpme/ui — if any of it renders unstyled, Tailwind is not scanning the
 * library's sources.
 */
export default function Index() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Help Me</h1>
          <p className="text-muted-foreground text-sm">
            Shared design system smoke test
          </p>
        </div>
        <ModeToggle />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
          <CardDescription>
            Rendered entirely from <code>@helpme/ui</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.label}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {expense.amount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger render={<Button>Add expense</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add expense</DialogTitle>
                  <DialogDescription>
                    Nothing is saved — this only proves the overlay works.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" placeholder="Coffee with Sam" />
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => toast.success('Design system is wired up.')}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => toast('Toasts come from the shared library too.')}
            >
              Fire a toast
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
