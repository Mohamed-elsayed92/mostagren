import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useEffect, useRef, useState } from "react";
import { FileText, Upload, Save, Search, Archive as ArchiveIcon } from "lucide-react";
import "./index.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tenant = {
  id: number;
  name: string;
  phone: string;
  endDate: string;
  apartment: string;
  floor: string;
  rent: number;
  contractFileName?: string;
  rentPaid?: boolean;
  prepaidNextMonth?: boolean;
  contractFileData?: string;
  paymentDate?: string;
};

const INITIAL_TENANTS: Tenant[] = [
  { id: 1, name: "يوسف نزيه حسن قلاش", phone: "01012345678", endDate: "2027-12-31", apartment: "1", floor: "ارضي", rent: 1000 },
  { id: 2, name: "كريم ابراهيم حافظ مرعي", phone: "01122334455", endDate: "2026-10-31", apartment: "2", floor: "ارضي", rent: 1000 },
  { id: 3, name: "تامر عبد العاطي توفيق", phone: "01098765432", endDate: "2027-10-31", apartment: "3", floor: "ثاني", rent: 1100 },
  { id: 4, name: "احمد محمد كمال البغدادي", phone: "01234567890", endDate: "2027-12-31", apartment: "4", floor: "ثاني", rent: 1100 },
  { id: 5, name: "علاء حمدي محمد مرعي", phone: "01555667788", endDate: "2026-09-30", apartment: "5", floor: "ثالث", rent: 750 },
  { id: 6, name: "محمد ابراهيم حافظ مرعي", phone: "01699887766", endDate: "2026-12-31", apartment: "6", floor: "ثالث", rent: 750 },
];

function isNearExpiry(endDate: string): boolean {
  const diff = new Date(endDate).getTime() - Date.now();
  const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;
  return diff >= 0 && diff <= ONE_MONTH;
}

function isExpired(endDate: string): boolean {
  return new Date(endDate).getTime() < Date.now();
}

function toArabicNumbers(num: number | string): string {
  if (num === undefined || num === null) return "";
  return num.toString().replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

function formatArabicDate(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function arabicMonthLabel(d: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" })
    .format(d)
    .replace(/[0-9]/g, (x) => "٠١٢٣٤٥٦٧٨٩"[parseInt(x)]);
}

function Home() {
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    if (typeof window === "undefined") return INITIAL_TENANTS;
    const saved = localStorage.getItem("tenants");
    return saved ? (JSON.parse(saved) as Tenant[]) : INITIAL_TENANTS;
  });

  const [query, setQuery] = useState("");
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    localStorage.setItem("tenants", JSON.stringify(tenants));
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) =>
      [t.name, t.phone, t.apartment, t.floor]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [tenants, query]);

  const total = tenants.reduce((sum, t) => {
    if (!t.rentPaid) return sum;
    const rent = Number(t.rent);
    return sum + (Number.isFinite(rent) ? rent : 0);
  }, 0);

  function updateTenant(id: number, patch: Partial<Tenant>) {
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  // 💡 تحسين الدالة لتقرأ الملف وتحوله لـ Base64 لكي يخزن في السنابشوت
  function handleFileUpload(id: number, file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      updateTenant(id, {
        contractFileName: file.name,
        contractFileData: base64Data,
      });
    };
    reader.readAsDataURL(file);
  }

  // 💡 إضافة دالة تحميل العقد المفقودة
  function downloadContract(t: Tenant) {
    if (!t.contractFileData) return;
    const link = document.createElement("a");
    link.href = t.contractFileData;
    link.download = t.contractFileName || `عقد_${t.name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 💡 إضافة دالة حذف العقد المفقودة
  function removeContract(id: number) {
    if (!window.confirm("هل أنت متأكد من حذف ملف العقد؟")) return;
    updateTenant(id, {
      contractFileName: undefined,
      contractFileData: undefined,
    });
    if (fileRefs.current[id]) {
      fileRefs.current[id]!.value = "";
    }
  }

  const navigate = useNavigate();

  function saveMonth() {
    const now = new Date();
    const monthLabel = arabicMonthLabel(now);
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextLabel = arabicMonthLabel(nextDate);

    const currentSnapshot = {
      id: now.toISOString(),
      monthLabel,
      savedAt: now.toISOString(),
      tenants: JSON.parse(JSON.stringify(tenants)) as Tenant[],
    };

    const prev = localStorage.getItem("tenants_archive");
    const archive: any[] = prev ? JSON.parse(prev) : [];

    const curIdx = archive.findIndex((s) => s.monthLabel === monthLabel);
    if (curIdx !== -1) archive[curIdx] = currentSnapshot;
    else archive.unshift(currentSnapshot);

    const prepaid = tenants.filter((t) => t.prepaidNextMonth);
    if (prepaid.length > 0) {
      const nextIdx = archive.findIndex((s) => s.monthLabel === nextLabel);
      let nextSnap: typeof currentSnapshot;
      if (nextIdx !== -1) {
        nextSnap = archive[nextIdx];
      } else {
        nextSnap = {
          id: nextDate.toISOString(),
          monthLabel: nextLabel,
          savedAt: now.toISOString(),
          tenants: tenants.map((t) => ({
            ...JSON.parse(JSON.stringify(t)),
            rent: 0,
            rentPaid: false,
            prepaidNextMonth: false,
            paymentDate: undefined,
          })),
        };
      }
      
      nextSnap.tenants = nextSnap.tenants.map((t) => {
        const p = prepaid.find((x) => x.id === t.id);
        if (!p) return t;
        return {
          ...t,
          rent: Number(p.rent) || 0,
          rentPaid: true,
          prepaidNextMonth: false,
          paymentDate: p.paymentDate || now.toISOString().split("T")[0],
        };
      });

      prepaid.forEach((p) => {
        if (!nextSnap.tenants.find((t) => t.id === p.id)) {
          nextSnap.tenants.push({
            ...JSON.parse(JSON.stringify(p)),
            rentPaid: true,
            prepaidNextMonth: false,
          });
        }
      });
      if (nextIdx !== -1) archive[nextIdx] = nextSnap;
      else archive.unshift(nextSnap);
    }

    localStorage.setItem("tenants_archive", JSON.stringify(archive));

    setTenants((prevT) =>
      prevT.map((t) =>
        t.prepaidNextMonth
          ? { ...t, rentPaid: true, prepaidNextMonth: false }
          : { ...t, rent: 0, rentPaid: false, paymentDate: undefined },
      ),
    );

    navigate({ to: "/archive" });
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h1 className="text-3xl font-bold text-foreground">إدارة المستأجرين</h1>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف أو الشقة..."
                className="rounded border border-input bg-background pr-8 pl-3 py-2 text-sm w-64"
              />
            </div>
            <button
              type="button"
              onClick={saveMonth}
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              <Save size={16} />
              <span>حفظ الشهر</span>
            </button>
            <Link
              to="/archive"
              className="inline-flex items-center gap-1 rounded border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              <ArchiveIcon size={16} />
              <span>السجل</span>
            </Link>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          الخلايا الحمراء تشير إلى عقود ستنتهي خلال شهر أو منتهية بالفعل. علّم "دفع مقدم" لمن سدّد إيجار الشهر القادم.
        </p>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">الاسم</th>
                <th className="px-3 py-2">رقم الهاتف</th>
                <th className="px-3 py-2">رقم الشقة</th>
                <th className="px-3 py-2">رقم الدور</th>
                <th className="px-3 py-2">قيمة الإيجار</th>
                  <th className="px-3 py-2">حالة الدفع</th>
                <th className="px-3 py-2">دفع مقدم</th>
                <th className="px-3 py-2">تاريخ الدفع</th>
                <th className="px-3 py-2">تاريخ انتهاء العقد</th>
                <th className="px-3 py-2">العقد (PDF)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t, idx) => {
                const alertRow = isNearExpiry(t.endDate) || isExpired(t.endDate);
                const highlightCls = alertRow ? "bg-red-100 text-red-900 font-semibold" : "";

                return (
                  <tr key={t.id} className={`border-t border-border text-center ${highlightCls}`}>
                    <td className="px-3 py-2">{toArabicNumbers(idx + 1)}</td>
                    <td className="px-3 py-2">{t.name}</td>
                    <td className="px-3 py-2">{toArabicNumbers(t.phone)}</td>
                    <td className="px-3 py-2">{toArabicNumbers(t.apartment)}</td>
                    <td className="px-3 py-2">{toArabicNumbers(t.floor)}</td>
                   <td className={`px-3 py-2 font-semibold tabular-nums ${t.rentPaid ? "text-green-700" : ""}`}>
                      {toArabicNumbers(t.rent)} ج.م
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        {t.rentPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-bold border border-green-300">
                            ✓ مدفوع
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-xs font-bold border border-red-200">
                            غير مدفوع
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const checked = !t.rentPaid;
                            updateTenant(t.id, {
                              rentPaid: checked,
                              paymentDate: checked
                                ? (t.paymentDate || new Date().toISOString().slice(0, 10))
                                : undefined,
                            });
                          }}
                          className={`rounded px-2 py-1 text-xs font-medium transition ${
                            t.rentPaid
                              ? "bg-muted text-foreground hover:bg-accent border border-input"
                              : "bg-primary text-primary-foreground hover:opacity-90"
                          }`}
                          title={t.rentPaid ? "تراجع عن الدفع" : "تأكيد الدفع"}
                        >
                          {t.rentPaid ? "تراجع" : "دفع"}
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!t.prepaidNextMonth}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          updateTenant(t.id, {
                            prepaidNextMonth: isChecked,
                            paymentDate: isChecked ? new Date().toISOString().split("T")[0] : t.paymentDate,
                          });
                        }}
                        className="h-4 w-4 accent-primary"
                        title="دفع إيجار الشهر القادم مقدماً"
                      />
                    </td>
  <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!t.prepaidNextMonth}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateTenant(t.id, {
                            prepaidNextMonth: checked,
                            paymentDate: checked || t.rentPaid
                              ? (t.paymentDate || new Date().toISOString().slice(0, 10))
                              : t.paymentDate,
                          });
                        }}
                        className="h-4 w-4 accent-primary"
                        title="دفع إيجار الشهر القادم مقدماً"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {t.paymentDate ? (
                        <span className="text-sm">{formatArabicDate(t.paymentDate)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 relative">
                      <span>{formatArabicDate(t.endDate)}</span>
                      <input
                        type="date"
                        value={t.endDate}
                        onChange={(e) => updateTenant(t.id, { endDate: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </td>
                          <td className="px-3 py-2">
                      <input
                        ref={(el) => {
                          fileRefs.current[t.id] = el;
                        }}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(t.id, e.target.files?.[0] ?? null)}
                      />
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => fileRefs.current[t.id]?.click()}
                          className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-primary-foreground hover:opacity-90 transition"
                          title={t.contractFileName ?? "رفع عقد PDF"}
                        >
                          <Upload size={16} />
                          <span>{t.contractFileData ? "استبدال" : "رفع"}</span>
                        </button>
                        {t.contractFileData && (
                          <>
                            <button
                              type="button"
                              onClick={() => downloadContract(t)}
                              className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-white hover:opacity-90 transition"
                              title={t.contractFileName}
                            >
                              <FileText size={16} />
                              <span>تحميل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeContract(t.id)}
                              className="inline-flex items-center justify-center rounded bg-red-600 px-2 py-1 text-white hover:opacity-90 transition"
                              title="حذف العقد"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted font-bold">
                <td colSpan={5} className="px-3 py-2 text-right">
                  الإجمالي (المدفوع)
                </td>
                <td className="px-3 py-2 text-center">
                  {toArabicNumbers(total)} ج.م
                </td>
                <td colSpan={5}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Home;