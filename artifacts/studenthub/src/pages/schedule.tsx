import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const apiUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

interface ScheduleSheetResponse {
  spreadsheetId: string;
  sheetTitle: string;
  sheetUrl: string;
  title: string | null;
  rows: string[][];
}

interface ApiError {
  status: number;
  message: string;
}

export function SchedulePage() {
  const query = useQuery<ScheduleSheetResponse, ApiError>({
    queryKey: ["schedule-sheet"],
    queryFn: async () => {
      const res = await fetch(apiUrl("api/google/schedule-sheet"));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { error?: string });
        throw {
          status: res.status,
          message: body.error || `HTTP ${res.status}`,
        } as ApiError;
      }
      return res.json();
    },
    retry: false,
  });

  const headerRow = query.data?.rows[0] ?? [];
  const bodyRows = query.data ? query.data.rows.slice(1) : [];
  const colCount = Math.max(
    headerRow.length,
    ...bodyRows.map((r) => r.length),
    0,
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Планирование</h2>
          <p className="text-muted-foreground mt-1">
            Таблица из Google Sheets, подключённой к твоему аккаунту.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {query.data?.sheetUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={query.data.sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Открыть в Google
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`}
            />
            Обновить
          </Button>
        </div>
      </div>

      {query.isLoading && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      )}

      {query.isError && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Не удалось загрузить таблицу
            </CardTitle>
            <CardDescription>{query.error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            {query.error.status === 401 ? (
              <p className="text-sm">
                Сначала подключи Google аккаунт в{" "}
                <Link href="/settings" className="text-primary underline">
                  Настройках
                </Link>
                .
              </p>
            ) : query.error.status === 403 ? (
              <p className="text-sm">
                У подключённого Google аккаунта нет доступа к этой таблице.
                Открой её для своего аккаунта (или подключи другой) и нажми
                «Обновить».
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => query.refetch()}
              >
                Попробовать снова
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {query.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {query.data.title || "Расписание"}
              <span className="text-muted-foreground font-normal text-sm ml-2">
                · {query.data.sheetTitle}
              </span>
            </CardTitle>
            <CardDescription>
              Строк: {bodyRows.length}, колонок: {colCount}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {query.data.rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground italic">
                Лист пустой.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-right text-muted-foreground">
                        #
                      </TableHead>
                      {Array.from({ length: colCount }).map((_, i) => (
                        <TableHead
                          key={i}
                          className="whitespace-nowrap font-semibold"
                        >
                          {headerRow[i] ?? ""}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bodyRows.map((row, ri) => (
                      <TableRow key={ri}>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {ri + 1}
                        </TableCell>
                        {Array.from({ length: colCount }).map((_, ci) => (
                          <TableCell
                            key={ci}
                            className="whitespace-pre-wrap align-top"
                          >
                            {row[ci] ?? ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
