import {  Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Save, Archive as ArchiveIcon } from "lucide-react";
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
};

const INITIAL_TENANTS: Tenant[] = [
  { id: 1, name: "أحمد محمد", phone: "01012345678", endDate: "2026-06-10", apartment: "1", floor: "1", rent: 3500 },
  { id: 2, name: "محمود علي", phone: "01122334455", endDate: "2026-12-01", apartment: "2", floor: "1", rent: 4000 },
  { id: 3, name: "سارة إبراهيم", phone: "01098765432", endDate: "2027-03-15", apartment: "3", floor: "2", rent: 3800 },
  { id: 4, name: "خالد حسن", phone: "01234567890", endDate: "2026-05-30", apartment: "4", floor: "2", rent: 4200 },
  { id: 5, name: "منى سعيد", phone: "01555667788", endDate: "2026-08-20", apartment: "5", floor: "3", rent: 3700 },
  { id: 6, name: "يوسف عمر", phone: "01699887766", endDate: "2027-01-05", apartment: "6", floor: "3", rent: 4500 },
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
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function Home() {
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    if (typeof window === "undefined") return INITIAL_TENANTS;
    const saved = localStorage.getItem("tenants");
    return saved ? (JSON.parse(saved) as Tenant[]) : INITIAL_TENANTS;
  });

  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    localStorage.setItem("tenants", JSON.stringify(tenants));
  }, [tenants]);

  // ✅ الإصلاح: نجمع فقط الإيجارات المدفوعة (rentPaid = true)،
  // ونتأكد أن القيمة رقم صحيح قبل الجمع لتفادي NaN أو تجميع نصوص.
  const total = tenants.reduce((sum, t) => {
    if (!t.rentPaid) return sum;
    const rent = Number(t.rent);
    return sum + (Number.isFinite(rent) ? rent : 0);
  }, 0);

  function updateTenant(id: number, patch: Partial<Tenant>) {
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function handleFileUpload(id: number, file: File | null) {
    if (!file) return;
    updateTenant(id, { contractFileName: file.name });
  }

  const navigate = useNavigate();

  function saveMonth() {
    const now = new Date();
    const monthLabel = new Intl.DateTimeFormat("ar-EG", {
      month: "long",
      year: "numeric",
    }).format(now).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);

    const snapshot = {
      id: now.toISOString(),
      monthLabel,
      savedAt: now.toISOString(),
      tenants: JSON.parse(JSON.stringify(tenants)) as Tenant[],
    };

    const prev = localStorage.getItem("tenants_archive");
    const archive: typeof snapshot[] = prev ? JSON.parse(prev) : [];

    const existingIndex = archive.findIndex((s) => s.monthLabel === monthLabel);
    if (existingIndex !== -1) {
      // استبدال الشهر الموجود بدلاً من الإضافة المكررة
      archive[existingIndex] = snapshot;
    } else {
      archive.unshift(snapshot);
    }

    localStorage.setItem("tenants_archive", JSON.stringify(archive));

    // مسح قيم الإيجار فقط وإعادة تعيين حالة الدفع لشهر جديد
    setTenants((prevT) => prevT.map((t) => ({ ...t, rent: 0, rentPaid: false })));

    navigate({ to: "/archive" });
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-foreground">إدارة المستأجرين</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveMonth}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
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
          الخلايا الحمراء تشير إلى عقود ستنتهي خلال شهر أو منتهية بالفعل.
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
                <th className="px-3 py-2">تاريخ انتهاء العقد</th>
                <th className="px-3 py-2">العقد (PDF)</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, idx) => {
                const alertRow = isNearExpiry(t.endDate) || isExpired(t.endDate);
                const highlightCls = alertRow ? "bg-red-100 text-red-900 font-semibold" : "";

                return (
                  <tr key={t.id} className={`border-t border-border text-center ${highlightCls}`}>
                    <td className="px-3 py-2">{toArabicNumbers(idx + 1)}</td>
                    <td className="px-3 py-2">{t.name}</td>
                    <td className="px-3 py-2">{toArabicNumbers(t.phone)}</td>
                    <td className="px-3 py-2">{toArabicNumbers(t.apartment)}</td>
                    <td className="px-3 py-2">{toArabicNumbers(t.floor)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!t.rentPaid}
                          onChange={(e) => updateTenant(t.id, { rentPaid: e.target.checked })}
                          className="h-4 w-4 accent-primary"
                          title="تم الدفع"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={toArabicNumbers(t.rent)}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/[^\d٠-٩]/g, "");
                            const english = cleaned.replace(/[٠-٩]/g, (d) =>
                              "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()
                            );
                            updateTenant(t.id, { rent: english === "" ? 0 : Number(english) });
                          }}
                          disabled={!t.rentPaid}
                          className={`w-24 rounded border border-input px-2 py-1 text-center ${
                            t.rentPaid ? "bg-background" : "bg-muted text-muted-foreground cursor-not-allowed"
                          }`}
                        />
                        <span>ج.م</span>
                      </div>
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
                      <button
                        type="button"
                        onClick={() => fileRefs.current[t.id]?.click()}
                        className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-primary-foreground hover:opacity-90 transition"
                        title={t.contractFileName ?? "رفع عقد PDF"}
                      >
                        {t.contractFileName ? <FileText size={16} /> : <Upload size={16} />}
                        <span>{t.contractFileName ? "تم الحفظ" : "رفع"}</span>
                      </button>
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
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Home;
