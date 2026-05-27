import * as Crypto from "expo-crypto";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Hive, HiveHealth, HiveNote, HiveType, SwarmStatus } from "../types";

export type HiveFormData = {
  hiveNumber: string;
  health: string;
  hasQueen: boolean;
  queenId: string;
  newNote: string;
  lastInspection: Date | null;
  inspectionNote: string;
  scheduledInspection: Date | null;
  frameCount: string;
  isHarvested: boolean;
  hasPollen: boolean;
  feedingDates: Date[];
  harvestDates: Date[];
  isActive: boolean;
};

export type SwarmFormData = {
  health: HiveHealth;
  swarmStatus: SwarmStatus;
  swarmStartDate: Date | null;
  scheduledInspection: Date | null;
  newNote: string;
  isActive: boolean;
};

const EMPTY_HIVE_FORM: HiveFormData = {
  hiveNumber: "", health: "good", hasQueen: true, queenId: "", newNote: "",
  lastInspection: null, inspectionNote: "", scheduledInspection: null, frameCount: "10",
  isHarvested: false, hasPollen: false, feedingDates: [], harvestDates: [], isActive: true,
};

const EMPTY_SWARM_FORM: SwarmFormData = {
  health: "good", swarmStatus: "empty", swarmStartDate: null,
  scheduledInspection: null, newNote: "", isActive: true,
};

export function useHiveEditModal() {
  const { state, updateLocation } = useApp();

  const [editingHive, setEditingHive] = useState<Hive | null>(null);
  const [editHiveModalVisible, setEditHiveModalVisible] = useState(false);
  const [editSwarmModalVisible, setEditSwarmModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hiveFormData, setHiveFormData] = useState<HiveFormData>(EMPTY_HIVE_FORM);
  const [swarmFormData, setSwarmFormData] = useState<SwarmFormData>(EMPTY_SWARM_FORM);

  const resetHiveForm = () => {
    setHiveFormData(EMPTY_HIVE_FORM);
    setEditingHive(null);
  };

  const resetSwarmForm = () => setSwarmFormData(EMPTY_SWARM_FORM);

  const openEditHiveModal = (hive: Hive) => {
    setEditingHive(hive);
    if (hive.type === "swarm") {
      setSwarmFormData({
        health: hive.health,
        swarmStatus: hive.swarmStatus || "empty",
        swarmStartDate: hive.swarmStartDate ? new Date(hive.swarmStartDate) : null,
        scheduledInspection: hive.scheduledInspection ? new Date(hive.scheduledInspection) : null,
        newNote: "",
        isActive: hive.isActive !== false,
      });
      setEditSwarmModalVisible(true);
    } else {
      setHiveFormData({
        hiveNumber: hive.number.toString(),
        health: hive.health,
        hasQueen: hive.hasQueen ?? true,
        queenId: hive.queenId || "",
        newNote: "",
        lastInspection: hive.lastInspection ? new Date(hive.lastInspection) : null,
        inspectionNote: "",
        scheduledInspection: hive.scheduledInspection ? new Date(hive.scheduledInspection) : null,
        frameCount: hive.frameCount?.toString() || "10",
        isHarvested: hive.isHarvested || false,
        hasPollen: hive.hasPollen || false,
        feedingDates: (hive.feedingDates || []).map((d) => new Date(d)),
        harvestDates: (hive.harvestDates || []).map((d) => new Date(d)),
        isActive: hive.isActive !== false,
      });
      setEditHiveModalVisible(true);
    }
  };

  const handleAddNote = () => {
    if (!editingHive) return;
    const text = editSwarmModalVisible ? swarmFormData.newNote.trim() : hiveFormData.newNote.trim();
    if (!text) return;
    const newNote: HiveNote = { id: Crypto.randomUUID(), text, createdAt: new Date() };
    const updatedHive: Hive = { ...editingHive, notes: [...(editingHive.notes || []), newNote], updatedAt: new Date() };
    const loc = state.locations.find((l) => l.id === editingHive.locationId);
    if (loc) {
      updateLocation(loc.id, { rows: loc.rows.map((row) => ({ ...row, hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)) })) });
      setEditingHive(updatedHive);
      if (editSwarmModalVisible) {
        setSwarmFormData((prev) => ({ ...prev, newNote: "" }));
      } else {
        setHiveFormData((prev) => ({ ...prev, newNote: "" }));
      }
    }
  };

  const handleDeleteNote = (noteId: string) => {
    if (!editingHive) return;
    const updatedHive: Hive = { ...editingHive, notes: (editingHive.notes || []).filter((n) => n.id !== noteId), updatedAt: new Date() };
    const loc = state.locations.find((l) => l.id === editingHive.locationId);
    if (loc) {
      updateLocation(loc.id, { rows: loc.rows.map((row) => ({ ...row, hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)) })) });
      setEditingHive(updatedHive);
    }
  };

  const handleSaveHive = async () => {
    if (!editingHive) return;
    const loc = state.locations.find((l) => l.id === editingHive.locationId);
    if (!loc) return;
    setSaving(true);
    const existingNotes = editingHive.notes || [];
    const notesWithInspection = hiveFormData.inspectionNote.trim() && hiveFormData.lastInspection
      ? [...existingNotes, { id: Crypto.randomUUID(), text: hiveFormData.inspectionNote.trim(), createdAt: hiveFormData.lastInspection } as HiveNote]
      : existingNotes;
    const updatedHive: Hive = {
      ...editingHive,
      type: editingHive.type || "hive",
      number: parseInt(hiveFormData.hiveNumber) || editingHive.number,
      health: hiveFormData.health as HiveHealth,
      hasQueen: hiveFormData.hasQueen,
      queenId: hiveFormData.queenId || undefined,
      lastInspection: hiveFormData.lastInspection || undefined,
      scheduledInspection: hiveFormData.scheduledInspection || undefined,
      frameCount: parseInt(hiveFormData.frameCount) || 10,
      isHarvested: hiveFormData.isHarvested,
      hasPollen: hiveFormData.hasPollen,
      feedingDates: hiveFormData.feedingDates,
      lastFeedingDate: hiveFormData.feedingDates.length > 0 ? hiveFormData.feedingDates[hiveFormData.feedingDates.length - 1] : undefined,
      harvestDates: hiveFormData.harvestDates,
      lastHarvestDate: hiveFormData.harvestDates.length > 0 ? hiveFormData.harvestDates[hiveFormData.harvestDates.length - 1] : undefined,
      notes: notesWithInspection,
      updatedAt: new Date(),
      isActive: hiveFormData.isActive,
    };
    await updateLocation(loc.id, { rows: loc.rows.map((row) => ({ ...row, hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)) })) });
    setSaving(false);
    setEditHiveModalVisible(false);
    resetHiveForm();
  };

  const handleSaveSwarm = async () => {
    if (!editingHive) return;
    const loc = state.locations.find((l) => l.id === editingHive.locationId);
    if (!loc) return;
    setSaving(true);
    const updatedHive: Hive = {
      ...editingHive,
      health: swarmFormData.health,
      swarmStatus: swarmFormData.swarmStatus,
      swarmStartDate: swarmFormData.swarmStartDate || undefined,
      scheduledInspection: swarmFormData.scheduledInspection || undefined,
      isActive: swarmFormData.isActive,
      updatedAt: new Date(),
    };
    await updateLocation(loc.id, { rows: loc.rows.map((row) => ({ ...row, hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)) })) });
    setSaving(false);
    setEditSwarmModalVisible(false);
    resetSwarmForm();
    setEditingHive(null);
  };

  const handleSwitchToSwarm = async () => {
    if (!editingHive) return;
    const loc = state.locations.find((l) => l.id === editingHive.locationId);
    if (!loc) return;
    const updatedHive: Hive = {
      ...editingHive,
      type: "swarm" as HiveType,
      swarmStatus: "empty" as SwarmStatus,
      hasQueen: undefined,
      queenId: undefined,
      frameCount: undefined,
      isHarvested: undefined,
      hasPollen: undefined,
      feedingDates: undefined,
      harvestDates: undefined,
      lastFeedingDate: undefined,
      lastHarvestDate: undefined,
      lastInspection: undefined,
      updatedAt: new Date(),
    };
    await updateLocation(loc.id, { rows: loc.rows.map((row) => ({ ...row, hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)) })) });
    setEditHiveModalVisible(false);
    resetHiveForm();
    setEditingHive(updatedHive);
    setSwarmFormData({ health: updatedHive.health, swarmStatus: "empty", swarmStartDate: null, scheduledInspection: null, newNote: "", isActive: updatedHive.isActive !== false });
    setEditSwarmModalVisible(true);
  };

  const handleSwitchToHive = async () => {
    if (!editingHive) return;
    const loc = state.locations.find((l) => l.id === editingHive.locationId);
    if (!loc) return;
    const updatedHive: Hive = {
      ...editingHive,
      type: "hive" as HiveType,
      hasQueen: true,
      frameCount: 10,
      swarmStatus: undefined,
      swarmStartDate: undefined,
      updatedAt: new Date(),
    };
    await updateLocation(loc.id, { rows: loc.rows.map((row) => ({ ...row, hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)) })) });
    setEditSwarmModalVisible(false);
    resetSwarmForm();
    setEditingHive(updatedHive);
    setHiveFormData({
      hiveNumber: updatedHive.number.toString(),
      health: updatedHive.health,
      hasQueen: true,
      queenId: "",
      newNote: "",
      lastInspection: null,
      inspectionNote: "",
      scheduledInspection: updatedHive.scheduledInspection ? new Date(updatedHive.scheduledInspection) : null,
      frameCount: "10",
      isHarvested: false,
      hasPollen: false,
      feedingDates: [],
      harvestDates: [],
      isActive: updatedHive.isActive !== false,
    });
    setEditHiveModalVisible(true);
  };

  return {
    editingHive,
    setEditingHive,
    hiveFormData,
    setHiveFormData,
    swarmFormData,
    setSwarmFormData,
    editHiveModalVisible,
    setEditHiveModalVisible,
    editSwarmModalVisible,
    setEditSwarmModalVisible,
    saving,
    openEditHiveModal,
    handleSaveHive,
    handleSaveSwarm,
    handleSwitchToSwarm,
    handleSwitchToHive,
    handleAddNote,
    handleDeleteNote,
    resetHiveForm,
    resetSwarmForm,
  };
}
