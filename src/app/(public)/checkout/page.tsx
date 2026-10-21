"use client";
import { PhotonAddressAutocomplete } from "@/components/address/photon-address-autocomplete";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Banknote, Landmark } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/lib/store/cart-store";
import { formatPrice, cleanProductName } from "@/lib/utils";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { divisions, getDistrictsByDivision } from "@/lib/data/bangladesh";
import { getThanasByDistrict } from "@/lib/data/bangladesh-thanas";
import { getPostCodesByDistrict } from "@/lib/data/bangladesh-postcodes";

// EDIT THESE: your real payment numbers / bank details
const LOCAL_METHODS = [
  { id: "bkash", label: "bKash", info: "Send Money to 01XXXXXXXXX (Personal)" },
  { id: "nagad", label: "Nagad", info: "Send Money to 01XXXXXXXXX (Personal)" },
  { id: "rocket", label: "Rocket", info: "Send Money to 01XXXXXXXXX-X (Personal)" },
  { id: "bank", label: "Bank transfer", info: "Bank: YOUR BANK | A/C name: YOUR NAME | A/C no: 0000000000" },
];

type Pay = "cod" | "local";

type ShippingMethodOption = {
  id: string;
  name: string;
  price: number;
  dhakaPrice: number;
  outsideDhakaPrice: number;
  freeThreshold: number | null;
  estimatedDays: string | null;
};

async function readJson(res: Response) {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : {};
  } catch {
    return {};
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [only, setOnly] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const finishing = useRef(false);
  useEffect(() => {
    setOnly(new URLSearchParams(window.location.search).get("only"));
    setReady(true);
  }, []);

  const allItems = useCartStore((s) => s.items);
  const items = only ? allItems.filter((i) => i.variantId === only) : allItems;
  const removeItemFromCart = useCartStore((s) => s.removeItem);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [pay, setPay] = useState<Pay>("cod");
  const [localMethod, setLocalMethod] = useState("bkash");
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodOption[]>([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState("");
  const [shippingMethodsLoading, setShippingMethodsLoading] = useState(true);
  const [shippingMethodsError, setShippingMethodsError] = useState("");
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(false);
  const [freeDeliveryMinimum, setFreeDeliveryMinimum] = useState(1000);

  useEffect(() => {
    let cancelled = false;

    async function loadShippingMethods() {
      setShippingMethodsLoading(true);
      setShippingMethodsError("");

      try {
        const res = await fetch("/api/v1/shipping", { cache: "no-store" });
        const json: any = await readJson(res);

        if (!res.ok) {
          throw new Error(json.error?.message || "Unable to load shipping methods.");
        }

        const methods = json.data?.methods;
        if (!Array.isArray(methods)) {
          throw new Error("Invalid shipping methods response.");
        }

        const settings = json.data?.settings;

        if (!cancelled) {
          setFreeDeliveryEnabled(settings?.freeDeliveryEnabled === true);

          const configuredMinimum = Number(settings?.freeDeliveryMinimum ?? 1000);
          setFreeDeliveryMinimum(
            Number.isFinite(configuredMinimum) && configuredMinimum >= 0
              ? configuredMinimum
              : 1000
          );

          setShippingMethods(methods);
          setSelectedShippingMethodId((current) =>
            methods.some((item: ShippingMethodOption) => item.id === current)
              ? current
              : (methods[0]?.id ?? "")
          );

          if (methods.length === 0) {
            setShippingMethodsError("No active Bangladesh courier is available. Please contact the store.");
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setShippingMethodsError(err?.message || "Unable to load shipping methods.");
        }
      } finally {
        if (!cancelled) setShippingMethodsLoading(false);
      }
    }

    loadShippingMethods();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (session?.user?.name && !fullName) setFullName(session.user.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (ready && items.length === 0 && !finishing.current) router.replace("/cart");
  }, [ready, items.length, router]);

  const divisionId = divisions.find((d) => d.name === division)?.id ?? "";
  const districtId = divisionId ? getDistrictsByDivision(divisionId).find((d) => d.name === district)?.id ?? "" : "";

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedShippingMethod = shippingMethods.find(
    (item) => item.id === selectedShippingMethodId
  );

  const globalShippingIsFree =
    freeDeliveryEnabled && subtotal >= freeDeliveryMinimum;

  const shippingIsFree = Boolean(
    globalShippingIsFree ||
    (
      selectedShippingMethod &&
      selectedShippingMethod.freeThreshold !== null &&
      subtotal >= selectedShippingMethod.freeThreshold
    )
  );

  const districtShippingPrice = selectedShippingMethod
    ? (
        district.trim().toLowerCase() === "dhaka"
          ? selectedShippingMethod.dhakaPrice
          : selectedShippingMethod.outsideDhakaPrice
      )
    : 0;

  const shippingCost = selectedShippingMethod
    ? (shippingIsFree ? 0 : districtShippingPrice)
    : 0;

  const total = subtotal + shippingCost;
  const method = LOCAL_METHODS.find((m) => m.id === localMethod)!;

  const afterOrder = () => {
    const rest = useCartStore.getState().items;
    if (only && rest.length > 0) {
      window.location.assign("/cart");
      return;
    }
    window.location.assign("/account/orders");
  };

  const placeOrder = async () => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      toast("Please sign in to place your order");
      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: "login" }));
      return;
    }
    if (fullName.trim().length < 2) return toast.error("Enter your full name");
    if (phone.trim().length < 6) return toast.error("Enter your phone number");
    if (!division || !district || !thana) return toast.error("Select division, district and thana");
    if (!postalCode) return toast.error("Select your post code");
    if (line1.trim().length < 2) return toast.error("Enter your address");
    if (shippingMethodsLoading) return toast.error("Please wait while shipping methods load");
    if (!selectedShippingMethod) return toast.error("Please select an available courier");
    if (pay === "local" && trxId.trim().length < 4) return toast.error("Enter the transaction ID of your payment");

    setLoading(true);
    try {
      const addrRes = await fetch("/api/v1/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          line1: line1.trim(),
          line2: [thana, line2.trim()].filter(Boolean).join(", "),
          city: district,
          state: division,
          postalCode,
          country: "Bangladesh",
          phone: phone.trim(),
          label: "Checkout",
        }),
      });
      const addrJson: any = await readJson(addrRes);
      if (!addrRes.ok) throw new Error(addrJson.error?.message ?? "Address error (" + addrRes.status + ")");

      const noteParts: string[] = [];
      if (pay === "local") {
        noteParts.push("PAYMENT: " + method.label + " | TrxID: " + trxId.trim() + (senderNumber.trim() ? " | Sender: " + senderNumber.trim() : ""));
      } else {
        noteParts.push("PAYMENT: Cash on delivery");
      }
      if (notes.trim()) noteParts.push(notes.trim());

      const res = await fetch("/api/v1/checkout/cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          addressId: addrJson.data.address.id,
          shippingMethodId: selectedShippingMethodId,
          notes: noteParts.join(" || "),
        }),
      });
      const json: any = await readJson(res);
      if (!res.ok) throw new Error(json.error?.message ?? "Order failed (" + res.status + ")");

      finishing.current = true;
      if (only) removeItemFromCart(only);
      else useCartStore.getState().clear();
      toast.success("Order placed");
      afterOrder();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!ready || items.length === 0) return null;

  const box = "rounded-lg border bg-white p-5 space-y-4";

  return (
    <div className="bg-[#eff0f5] py-6">
      <Container>
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-xl font-bold">Order</h1>

          <div className={box}>
            {items.map((i) => (
              <div key={i.variantId} className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cleanProductName(i.name)}</p>
                  <p className="text-xs text-gray-500">Qty {i.quantity}</p>
                </div>
                <p className="text-sm font-semibold">{formatPrice(i.price * i.quantity)}</p>
              </div>
            ))}
          </div>

          <div className={box}>
            <h2 className="font-semibold">Delivery address</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <PhotonAddressAutocomplete
                value={line1}
                onChange={setLine1}
                onSelect={(address) => {
                  setLine1(address.line1 || line1);
                  if (address.line2) setLine2(address.line2);

                  const normalize = (value: string) =>
                    value
                      .toLowerCase()
                      .replace(/\bdivision\b/g, "")
                      .replace(/\bdistrict\b/g, "")
                      .replace(/\s+/g, " ")
                      .trim();

                  const divisionCandidates = [
                    address.division,
                    address.state,
                  ].filter(Boolean);

                  const matchedDivision = divisions.find((item) =>
                    divisionCandidates.some(
                      (candidate) =>
                        normalize(candidate) === normalize(item.name) ||
                        normalize(candidate) === normalize(item.name + " division")
                    )
                  );

                  if (matchedDivision) {
                    setDivision(matchedDivision.name);

                    const districtCandidates = [
                      address.district,
                      address.city,
                    ].filter(Boolean);

                    const availableDistricts = getDistrictsByDivision(
                      matchedDivision.id
                    );

                    const matchedDistrict = availableDistricts.find((item) =>
                      districtCandidates.some(
                        (candidate) =>
                          normalize(candidate) === normalize(item.name)
                      )
                    );

                    if (matchedDistrict) {
                      setDistrict(matchedDistrict.name);

                      const matchedThana = getThanasByDistrict(
                        matchedDistrict.id
                      ).find((item) =>
                        [
                          address.thana,
                          address.suburb,
                          address.city,
                        ].some(
                          (candidate) =>
                            Boolean(candidate) &&
                            normalize(candidate!) === normalize(item.name)
                        )
                      );

                      if (matchedThana) setThana(matchedThana.name);

                      const matchedPostCode = getPostCodesByDistrict(
                        matchedDistrict.id
                      ).find(
                        (item) => item.code === address.postalCode
                      );

                      if (matchedPostCode) {
                        setPostalCode(matchedPostCode.code);
                      }
                    }
                  }
                }}
                placeholder="Type street, area, city or postcode"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address line 2 (optional)</Label>
              <Input value={line2} onChange={(e) => setLine2(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Division</Label>
                <SearchableSelect
                  options={divisions.map((d) => ({ value: d.name, label: d.name, sublabel: d.bn }))}
                  value={division}
                  onChange={(v) => {
                    setDivision(v);
                    setDistrict("");
                    setThana("");
                    setPostalCode("");
                  }}
                  placeholder="Select division"
                  searchPlaceholder="Search division..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>District</Label>
                <SearchableSelect
                  options={getDistrictsByDivision(divisionId).map((d) => ({ value: d.name, label: d.name, sublabel: d.bn }))}
                  value={district}
                  onChange={(v) => {
                    setDistrict(v);
                    setThana("");
                    setPostalCode("");
                  }}
                  placeholder={division ? "Select district" : "Select division first"}
                  searchPlaceholder="Search district..."
                  disabled={!division}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Thana / Upazila</Label>
                <SearchableSelect
                  options={getThanasByDistrict(districtId).map((t) => ({ value: t.name, label: t.name }))}
                  value={thana}
                  onChange={setThana}
                  placeholder={district ? "Select thana" : "Select district first"}
                  searchPlaceholder="Search thana..."
                  disabled={!districtId}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Post code</Label>
                <SearchableSelect
                  options={getPostCodesByDistrict(districtId).map((p) => ({ value: p.code, label: p.code, sublabel: p.area }))}
                  value={postalCode}
                  onChange={setPostalCode}
                  placeholder={district ? "Select post code" : "Select district first"}
                  searchPlaceholder="Search post code..."
                  disabled={!districtId}
                />
              </div>
            </div>
          </div>

          <div className={box}>
            <h2 className="font-semibold">Shipping method</h2>

            {shippingMethodsLoading ? (
              <p className="text-sm text-gray-500">Loading available couriers...</p>
            ) : shippingMethodsError ? (
              <p role="alert" className="text-sm text-red-600">{shippingMethodsError}</p>
            ) : (
              <div className="space-y-3">
                {shippingMethods.map((shippingOption) => (
                  <label
                    key={shippingOption.id}
                    className={
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-4 " +
                      (selectedShippingMethodId === shippingOption.id
                        ? "border-[#f85606] bg-orange-50"
                        : "hover:border-gray-400")
                    }
                  >
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={shippingOption.id}
                      checked={selectedShippingMethodId === shippingOption.id}
                      onChange={() => setSelectedShippingMethodId(shippingOption.id)}
                      className="mt-1"
                    />
                    <span className="flex-1">
                      <span className="block font-medium">{shippingOption.name}</span>
                      {shippingOption.estimatedDays && (
                        <span className="block text-xs text-gray-500">
                          Estimated delivery: {shippingOption.estimatedDays}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">
                      {(freeDeliveryEnabled && subtotal >= freeDeliveryMinimum) ||
                      (shippingOption.freeThreshold !== null &&
                      subtotal >= shippingOption.freeThreshold)
                        ? "Free"
                        : formatPrice(
                            district.trim().toLowerCase() === "dhaka"
                              ? shippingOption.dhakaPrice
                              : shippingOption.outsideDhakaPrice
                          )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className={box}>
            <h2 className="font-semibold">Payment</h2>

            <button
              type="button"
              onClick={() => setPay("cod")}
              className={"flex w-full items-center gap-3 rounded-lg border p-4 text-left " + (pay === "cod" ? "border-[#f85606] bg-orange-50" : "hover:border-gray-400")}
            >
              <Banknote className="h-5 w-5" />
              <div className="flex-1">
                <p className="font-medium">Cash on delivery</p>
                <p className="text-xs text-gray-500">Pay when you receive your order</p>
              </div>
              <input type="radio" readOnly checked={pay === "cod"} />
            </button>

            <button
              type="button"
              onClick={() => setPay("local")}
              className={"flex w-full items-center gap-3 rounded-lg border p-4 text-left " + (pay === "local" ? "border-[#f85606] bg-orange-50" : "hover:border-gray-400")}
            >
              <Landmark className="h-5 w-5" />
              <div className="flex-1">
                <p className="font-medium">Local payment</p>
                <p className="text-xs text-gray-500">bKash, Nagad, Rocket or bank transfer</p>
              </div>
              <input type="radio" readOnly checked={pay === "local"} />
            </button>

            {pay === "local" && (
              <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                <div className="flex flex-wrap gap-2">
                  {LOCAL_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLocalMethod(m.id)}
                      className={"rounded-full border px-4 py-1.5 text-sm " + (localMethod === m.id ? "border-[#f85606] bg-[#f85606] text-white" : "bg-white hover:border-gray-400")}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm">
                  Pay <span className="font-bold">{formatPrice(total)}</span> now. {method.info}
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Transaction ID</Label>
                    <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Your sending number (optional)</Label>
                    <Input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Delivery{selectedShippingMethod ? " (" + selectedShippingMethod.name + ")" : ""}
                </span>
                <span>{formatPrice(shippingCost)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={placeOrder}
              disabled={loading || shippingMethodsLoading || !selectedShippingMethod}
              className="flex w-full items-center justify-center gap-2 rounded bg-[#f85606] py-3 font-bold text-white hover:bg-[#d94b05] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Order now
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}
