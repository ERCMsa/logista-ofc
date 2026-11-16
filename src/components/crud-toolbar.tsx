import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

type FilterOption = string | { value: string; label: string };

interface Props {
  search: string;
  onSearch: (v: string) => void;
  filter?: string;
  onFilter?: (v: string) => void;
  filterOptions?: FilterOption[];
  filterLabel?: string;
}

export function CrudToolbar({ search, onSearch, filter, onFilter, filterOptions, filterLabel }: Props) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={t("common.search")} className="pl-9 glass border-border/60" />
      </div>
      {filterOptions && onFilter && (
        <Select value={filter || "all"} onValueChange={onFilter}>
          <SelectTrigger className="w-[200px] glass border-border/60">
            <SelectValue placeholder={filterLabel || t("common.filter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {filterOptions.map((o) => {
              const value = typeof o === "string" ? o : o.value;
              const label = typeof o === "string" ? o : o.label;
              return <SelectItem key={value} value={value}>{label}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
