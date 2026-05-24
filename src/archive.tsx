import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, XCircle } from "lucide-react";
import "./index.css";

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

type Snapshot = {
  id: string;
  monthLabel: string; // e.g. "يونيو ٢٠٢٦"
  savedAt: string;
  tenants: Tenant[];
};

function toArabicNumbers(num: number | string): string {
  if (num === undefined || num === null) return "";
  return num.toString().replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}


function Archive() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("tenants_archive");
    if (saved) setSnapshots(JSON.parse(saved) as Snapshot[]);
  }, []);

  function removeSnapshot(id: string) {
    const next = snapshots.filter((s) => s.id !== id);
    setSnapshots(next);
    localStorage.setItem("tenants_archive", JSON.stringify(next));
  }

  function removeLastSnapshot() {
    if (snapshots.length === 0) return;
    const next = snapshots.slice(0, -1);
    setSnapshots(next);
    localStorage.setItem("tenants_archive", JSON.stringify(next));
  }

  function clearAllSnapshots() {
    if (!window.confirm("هل أنت متأكد من مسح السجل بالكامل؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setSnapshots([]);
    localStorage.removeItem("tenants_archive");
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">سجل الإيجارات الشهري</h1>
          <div className="flex items-center gap-2">
            {snapshots.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={removeLastSnapshot}
                  className="inline-flex items-center gap-1 rounded bg-orange-600 px-3 py-2 text-white text-sm hover:bg-orange-700 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  مسح آخر إضافة
                </button>
                <button
                  type="button"
                  onClick={clearAllSnapshots}
                  className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-2 text-white text-sm hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  مسح السجل كله
                </button>
              </>
            )}
            <Link
              to="/"
              className="rounded bg-primary px-3 py-2 text-primary-foreground text-sm hover:opacity-90"
            >
              العودة
            </Link>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <p className="text-muted-foreground">لا توجد بيانات محفوظة بعد.</p>
        ) : (
          <div className="space-y-8">
            {snapshots.map((snap) => {
              const total = snap.tenants.reduce(
                (s, t) => s + (t.rentPaid ? Number(t.rent) || 0 : 0),
                0,
              );
              return (
                <div key={snap.id} className="rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between bg-muted px-4 py-3 rounded-t-lg">
                    <h2 className="text-xl font-bold">{snap.monthLabel}</h2>
                    <button
                      type="button"
                      onClick={() => removeSnapshot(snap.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">الاسم</th>
                          <th className="px-3 py-2">رقم الهاتف</th>
                          <th className="px-3 py-2">رقم الشقة</th>
                          <th className="px-3 py-2">رقم الدور</th>
                          <th className="px-3 py-2">قيمة الإيجار</th>
                          <th className="px-3 py-2">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snap.tenants.map((t, idx) => (
                          <tr key={t.id} className="border-t border-border text-center">
                            <td className="px-3 py-2">{toArabicNumbers(idx + 1)}</td>
                            <td className="px-3 py-2">{t.name}</td>
                            <td className="px-3 py-2">{toArabicNumbers(t.phone)}</td>
                            <td className="px-3 py-2">{toArabicNumbers(t.apartment)}</td>
                            <td className="px-3 py-2">{toArabicNumbers(t.floor)}</td>
                            <td className="px-3 py-2">
                              {toArabicNumbers(t.rent)} ج.م
                            </td>
                            <td className="px-3 py-2">
                              {t.rentPaid ? (
                                <span className="text-green-700">مدفوع</span>
                              ) : (
                                <span className="text-red-700">غير مدفوع</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted font-bold">
                          <td colSpan={5} className="px-3 py-2 text-right">
                            الإجمالي (المدفوع)
                          </td>
                          <td colSpan={2} className="px-3 py-2 text-center">
                            {toArabicNumbers(total)} ج.م
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Archive;
