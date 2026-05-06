import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import { Button, Card, DetailRow, EmptyState, ErrorBanner, Field, InlineNotice, LoadingState, RequireSession, Screen, SectionTitle, SegmentedControl, Tag, WardrobeImage, styles } from "@/components/ui";
import { asArray, asText } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { imageAssetToFormData, pickWardrobeImage } from "@/lib/mobile-upload";

type WardrobeItem = {
  id: number;
  name: string;
  category: string;
  slot: string;
  color: string;
  brand?: string | null;
  image_url?: string | null;
  processed_image_url?: string | null;
  tags?: string[];
  occasions?: string[];
  style_notes?: string | null;
};

const defaultForm = {
  name: "",
  category: "tops",
  slot: "top",
  color: "black",
  brand: "",
  tags: "daily",
  occasions: "work",
  styleNotes: "",
};

function splitList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function formatFileSize(bytes?: number) {
  if (!bytes) {
    return "size unknown";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WardrobeScreen() {
  const auth = useAuth();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [processStatus, setProcessStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.isSignedIn) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await auth.request<WardrobeItem[]>("/api/v1/wardrobe/items");
      setItems(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load wardrobe.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort();
    return [{ label: "All", value: "all" }, ...categories.map((category) => ({ label: category, value: category }))];
  }, [items]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        item.name,
        item.category,
        item.slot,
        item.color,
        item.brand,
        item.style_notes,
        ...asArray<string>(item.tags),
        ...asArray<string>(item.occasions),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [categoryFilter, items, search]);

  async function pickImage() {
    try {
      const nextImage = await pickWardrobeImage();
      setPickedImage(nextImage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pick an image.");
    }
  }

  async function pollTask(taskId: number) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const task = await auth.request<{ status: string; error_message?: string | null }>(`/api/v1/assistant/tasks/${taskId}`);
      setProcessStatus(`Image task ${taskId}: ${task.status}`);
      if (["completed", "failed"].includes(task.status)) {
        if (task.status === "failed") {
          throw new Error(task.error_message || "Image processing failed.");
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("Image processing is still running. Pull to refresh and retry if it does not finish.");
  }

  async function saveItem() {
    setSaving(true);
    setError(null);
    setProcessStatus(null);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        slot: form.slot.trim(),
        color: form.color.trim(),
        brand: form.brand.trim() || null,
        tags: splitList(form.tags),
        occasions: splitList(form.occasions),
        style_notes: form.styleNotes.trim() || null,
      };

      let item = await auth.request<WardrobeItem>(editingItem ? `/api/v1/wardrobe/items/${editingItem.id}` : "/api/v1/wardrobe/items", {
        method: editingItem ? "PUT" : "POST",
        body: payload,
      });

      if (pickedImage) {
        setProcessStatus("Uploading selected image");
        item = await auth.request<WardrobeItem>(`/api/v1/wardrobe/items/${item.id}/upload-image`, {
          method: "POST",
          body: imageAssetToFormData(pickedImage),
          timeoutMs: 45000,
        });
        setProcessStatus("Queued image processing");
        const task = await auth.request<{ id: number }>(`/api/v1/wardrobe/items/${item.id}/process-image-async`, { method: "POST" });
        await pollTask(task.id);
      }

      setForm(defaultForm);
      setEditingItem(null);
      setPickedImage(null);
      setProcessStatus(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save wardrobe item.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: WardrobeItem) {
    setEditingItem(item);
    setPickedImage(null);
    setProcessStatus(null);
    setForm({
      name: item.name || "",
      category: item.category || "",
      slot: item.slot || "",
      color: item.color || "",
      brand: item.brand || "",
      tags: asArray<string>(item.tags).join(", "),
      occasions: asArray<string>(item.occasions).join(", "),
      styleNotes: item.style_notes || "",
    });
  }

  function cancelEdit() {
    setEditingItem(null);
    setPickedImage(null);
    setProcessStatus(null);
    setForm(defaultForm);
  }

  async function processItem(item: WardrobeItem) {
    setSaving(true);
    setError(null);
    setProcessStatus("Queued image processing");
    try {
      const task = await auth.request<{ id: number }>(`/api/v1/wardrobe/items/${item.id}/process-image-async`, { method: "POST" });
      await pollTask(task.id);
      setProcessStatus(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process image.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: WardrobeItem) {
    Alert.alert("Delete item", `Remove ${item.name} from your wardrobe?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setError(null);
          try {
            await auth.request(`/api/v1/wardrobe/items/${item.id}`, { method: "DELETE" });
            if (editingItem?.id === item.id) {
              cancelEdit();
            }
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete wardrobe item.");
          }
        },
      },
    ]);
  }

  return (
    <Screen title="Wardrobe" subtitle="Search, edit, upload, process, and manage private clothing records." refreshing={loading} onRefresh={load}>
      <RequireSession>
        <ErrorBanner message={error} />
        <Card>
          <SectionTitle title={editingItem ? "Edit clothing" : "Add clothing"} detail="Native upload path for App Store review" />
          <Field label="Name" value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} placeholder="Black blazer" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Category" value={form.category} onChangeText={(value) => setForm({ ...form, category: value })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Slot" value={form.slot} onChangeText={(value) => setForm({ ...form, slot: value })} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Color" value={form.color} onChangeText={(value) => setForm({ ...form, color: value })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Brand" value={form.brand} onChangeText={(value) => setForm({ ...form, brand: value })} />
            </View>
          </View>
          <Field label="Tags" value={form.tags} onChangeText={(value) => setForm({ ...form, tags: value })} placeholder="daily, tailored" />
          <Field label="Occasions" value={form.occasions} onChangeText={(value) => setForm({ ...form, occasions: value })} placeholder="work, dinner" />
          <Field label="Style notes" value={form.styleNotes} onChangeText={(value) => setForm({ ...form, styleNotes: value })} multiline />
          <Button label={pickedImage ? "Change selected image" : "Choose image"} variant="secondary" onPress={pickImage} disabled={saving} />
          {pickedImage ? <InlineNotice title={pickedImage.fileName || "Image selected"} detail={`${pickedImage.mimeType || "image/jpeg"} - ${formatFileSize(pickedImage.fileSize)}`} /> : null}
          {processStatus ? <InlineNotice title="Processing status" detail={processStatus} /> : null}
          <Button label={editingItem ? "Save changes" : "Save item"} onPress={saveItem} disabled={saving || !form.name.trim()} />
          {editingItem ? <Button label="Cancel edit" variant="secondary" onPress={cancelEdit} disabled={saving} /> : null}
        </Card>

        <Card>
          <SectionTitle title="Find items" detail={`${visibleItems.length} of ${items.length} shown`} />
          <Field label="Search" value={search} onChangeText={setSearch} placeholder="name, color, tag, occasion" />
          <SegmentedControl value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
        </Card>

        {loading ? <LoadingState label="Loading wardrobe" /> : null}
        {items.length === 0 && !loading ? <EmptyState title="No clothing yet" detail="Add your first item with a name, category, color, and optional image." /> : null}
        {items.length > 0 && visibleItems.length === 0 ? <EmptyState title="No matching items" detail="Clear search or switch category filters." /> : null}
        {visibleItems.map((item) => (
          <Card key={item.id}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <WardrobeImage uri={item.processed_image_url || item.image_url} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <DetailRow label="Category" value={item.category} />
                <DetailRow label="Color" value={item.color} />
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {asArray<string>(item.tags).slice(0, 3).map((tag) => <Tag key={tag} label={tag} />)}
                  {asArray<string>(item.occasions).slice(0, 2).map((tag) => <Tag key={tag} label={tag} tone="gold" />)}
                </View>
              </View>
            </View>
            <Text style={styles.muted}>{asText(item.style_notes, "No style notes yet.")}</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button label="Edit" variant="secondary" onPress={() => startEdit(item)} disabled={saving} />
              <Button label="Process" variant="secondary" onPress={() => processItem(item)} disabled={saving || !item.image_url} />
              <Button label="Delete" variant="danger" onPress={() => deleteItem(item)} disabled={saving} />
            </View>
          </Card>
        ))}
      </RequireSession>
    </Screen>
  );
}
