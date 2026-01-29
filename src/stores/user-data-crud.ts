/**
 * CRUD action factories for user data store.
 *
 * Creates add/update/delete/restore actions for each item type.
 */

/* eslint-disable @typescript-eslint/explicit-module-boundary-types -- Factory functions return inferred object types spread into store */

import type {
  EquipmentPiece,
  Enchantment,
  Modifier,
  Gem,
  VariantTypeEntry,
  VariantTypes,
} from "@/models/types";
import type {
  UserEquipmentRecord,
  UserEnchantmentRecord,
  UserModifierRecord,
  UserGemRecord,
  UserVariantTypes,
} from "@/data/user-data-types";
import {
  addEquipmentRecord,
  updateEquipmentRecord,
  deleteEquipmentRecord,
  restoreEquipmentRecord,
  addEnchantmentRecord,
  updateEnchantmentRecord,
  deleteEnchantmentRecord,
  restoreEnchantmentRecord,
  addModifierRecord,
  updateModifierRecord,
  deleteModifierRecord,
  restoreModifierRecord,
  addGemRecord,
  updateGemRecord,
  deleteGemRecord,
  restoreGemRecord,
} from "./user-data-helpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserDataCrudState {
  readonly userEquipment: readonly UserEquipmentRecord[];
  readonly userEnchantments: readonly UserEnchantmentRecord[];
  readonly userModifiers: readonly UserModifierRecord[];
  readonly userGems: readonly UserGemRecord[];
  readonly userVariantTypes: UserVariantTypes;
}

type SetFn = (fn: (state: UserDataCrudState) => Partial<UserDataCrudState>) => void;
type GetFn = () => UserDataCrudState;

interface BundledDataGetters {
  getBundledEquipment: () => readonly EquipmentPiece[];
  getBundledEnchantments: () => readonly Enchantment[];
  getBundledModifiers: () => readonly Modifier[];
  getBundledGems: () => readonly Gem[];
  getBundledVariantTypes: () => VariantTypes;
}

// ---------------------------------------------------------------------------
// Equipment CRUD
// ---------------------------------------------------------------------------

export function createEquipmentActions(set: SetFn, get: GetFn, bundled: BundledDataGetters) {
  return {
    addEquipment: (item: EquipmentPiece) => {
      const result = addEquipmentRecord(get().userEquipment, item);
      set(() => ({ userEquipment: result.records }));
      return result.id;
    },
    updateEquipment: (id: string, item: EquipmentPiece) => {
      set(() => ({ userEquipment: updateEquipmentRecord(get().userEquipment, bundled.getBundledEquipment(), id, item) }));
    },
    deleteEquipment: (id: string) => {
      set(() => ({ userEquipment: deleteEquipmentRecord(get().userEquipment, bundled.getBundledEquipment(), id) }));
    },
    restoreEquipment: (id: string) => {
      set(() => ({ userEquipment: restoreEquipmentRecord(get().userEquipment, id) }));
    },
  };
}

// ---------------------------------------------------------------------------
// Enchantment CRUD
// ---------------------------------------------------------------------------

export function createEnchantmentActions(set: SetFn, get: GetFn, bundled: BundledDataGetters) {
  return {
    addEnchantment: (item: Enchantment) => {
      const result = addEnchantmentRecord(get().userEnchantments, item);
      set(() => ({ userEnchantments: result.records }));
      return result.id;
    },
    updateEnchantment: (id: string, item: Enchantment) => {
      set(() => ({ userEnchantments: updateEnchantmentRecord(get().userEnchantments, bundled.getBundledEnchantments(), id, item) }));
    },
    deleteEnchantment: (id: string) => {
      set(() => ({ userEnchantments: deleteEnchantmentRecord(get().userEnchantments, bundled.getBundledEnchantments(), id) }));
    },
    restoreEnchantment: (id: string) => {
      set(() => ({ userEnchantments: restoreEnchantmentRecord(get().userEnchantments, id) }));
    },
  };
}

// ---------------------------------------------------------------------------
// Modifier CRUD
// ---------------------------------------------------------------------------

export function createModifierActions(set: SetFn, get: GetFn, bundled: BundledDataGetters) {
  return {
    addModifier: (item: Modifier) => {
      const result = addModifierRecord(get().userModifiers, item);
      set(() => ({ userModifiers: result.records }));
      return result.id;
    },
    updateModifier: (id: string, item: Modifier) => {
      set(() => ({ userModifiers: updateModifierRecord(get().userModifiers, bundled.getBundledModifiers(), id, item) }));
    },
    deleteModifier: (id: string) => {
      set(() => ({ userModifiers: deleteModifierRecord(get().userModifiers, bundled.getBundledModifiers(), id) }));
    },
    restoreModifier: (id: string) => {
      set(() => ({ userModifiers: restoreModifierRecord(get().userModifiers, id) }));
    },
  };
}

// ---------------------------------------------------------------------------
// Gem CRUD
// ---------------------------------------------------------------------------

export function createGemActions(set: SetFn, get: GetFn, bundled: BundledDataGetters) {
  return {
    addGem: (item: Gem) => {
      const result = addGemRecord(get().userGems, item);
      set(() => ({ userGems: result.records }));
      return result.id;
    },
    updateGem: (id: string, item: Gem) => {
      set(() => ({ userGems: updateGemRecord(get().userGems, bundled.getBundledGems(), id, item) }));
    },
    deleteGem: (id: string) => {
      set(() => ({ userGems: deleteGemRecord(get().userGems, bundled.getBundledGems(), id) }));
    },
    restoreGem: (id: string) => {
      set(() => ({ userGems: restoreGemRecord(get().userGems, id) }));
    },
  };
}

// ---------------------------------------------------------------------------
// Variant Type CRUD
// ---------------------------------------------------------------------------

export function createVariantTypeActions(set: SetFn, _get: GetFn, bundled: BundledDataGetters) {
  return {
    addVariantType: (key: string, entry: VariantTypeEntry) => {
      set((s) => ({
        userVariantTypes: { ...s.userVariantTypes, additions: { ...s.userVariantTypes.additions, [key]: entry } },
      }));
    },
    updateVariantType: (key: string, entry: VariantTypeEntry) => {
      const bundledVT = bundled.getBundledVariantTypes();
      set((s) => {
        if (key in bundledVT) {
          return { userVariantTypes: { ...s.userVariantTypes, modifications: { ...s.userVariantTypes.modifications, [key]: entry } } };
        }
        return { userVariantTypes: { ...s.userVariantTypes, additions: { ...s.userVariantTypes.additions, [key]: entry } } };
      });
    },
    deleteVariantType: (key: string) => {
      const bundledVT = bundled.getBundledVariantTypes();
      set((s) => {
        if (key in bundledVT) {
          return { userVariantTypes: { ...s.userVariantTypes, deletedKeys: [...s.userVariantTypes.deletedKeys, key] } };
        }
        const { [key]: _, ...rest } = s.userVariantTypes.additions;
        return { userVariantTypes: { ...s.userVariantTypes, additions: rest } };
      });
    },
    restoreVariantType: (key: string) => {
      set((s) => ({
        userVariantTypes: { ...s.userVariantTypes, deletedKeys: s.userVariantTypes.deletedKeys.filter((k) => k !== key) },
      }));
    },
  };
}
