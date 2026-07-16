"use client";

import { useState } from "react";

const PRESET_CATEGORIES = [
  "ビザ・就労資格",
  "車検",
  "保険",
  "免許",
  "契約",
  "健康診断",
  "その他",
];

export function CategoryField() {
  const [category, setCategory] = useState("");

  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        カテゴリ
        <select
          name="category"
          required
          className="rounded border border-gray-300 px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="" disabled>
            選択してください
          </option>
          {PRESET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {category === "その他" && (
        <label className="flex flex-col gap-1 text-sm">
          カテゴリ名(自由入力)
          <input
            name="categoryOther"
            required
            className="rounded border border-gray-300 px-3 py-2"
            placeholder="例: 消防設備点検"
          />
        </label>
      )}
    </>
  );
}
