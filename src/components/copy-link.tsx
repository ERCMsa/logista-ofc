import { Button } from "@/components/ui/button";
import { Copy, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function CopyLink({ url }: { url?: string | null }) {
  const { t } = useTranslation();
  if (!url) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("common.copied", "Copied"));
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <div className="flex items-center gap-1">
      <a href={url} target="_blank" rel="noopener noreferrer"
         className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-[160px]">
        <MapPin className="h-3 w-3" />{t("common.openMap", "Open map")}
      </a>
      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={copy}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
