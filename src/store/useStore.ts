import { create } from 'zustand';
import type { HenkatenRecord } from '../types';
import { api, type CustomOption } from '../lib/api';

interface AppState {
  records: HenkatenRecord[];
  isLoading: boolean;
  error: string | null;
  customLineNames: CustomOption[];
  customDepartments: CustomOption[];
  fetchRecords: () => Promise<void>;
  addRecord: (record: Omit<HenkatenRecord, 'id' | 'createdAt' | 'photo'>, photoFile?: File | null) => Promise<void>;
  updateRecord: (id: string, record: Partial<HenkatenRecord>, newPhotoFile?: File | null) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  uploadTrialDocument: (id: string, file: File) => Promise<void>;
  deleteTrialDocument: (id: string) => Promise<void>;
  fetchOptions: () => Promise<void>;
  addLineName: (name: string) => Promise<void>;
  deleteLineName: (id: string) => Promise<void>;
  addDepartment: (name: string) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
}

type RecordPatch = Record<string, unknown>;

interface DbRecordRow {
  id: string;
  line_name: string;
  date_start: string;
  date_finish: string;
  category: string | null;
  henkaten_info: string | null;
  risk_level: string | null;
  tujuan_henkaten: string | null;
  pic_name: string | null;
  departemen: string | null;
  photo: string | null;
  trial_document: string | null;
  trial_document_name: string | null;
  keterangan: string | null;
  created_by: string;
  created_at: string;
}

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const toRecord = (d: DbRecordRow): HenkatenRecord => ({
  id: d.id,
  lineName: d.line_name,
  dateStart: d.date_start,
  dateFinish: d.date_finish,
  category: d.category as HenkatenRecord['category'],
  henkatenInfo: d.henkaten_info ?? '',
  riskLevel: d.risk_level as HenkatenRecord['riskLevel'],
  tujuanHenkaten: d.tujuan_henkaten ?? '',
  picName: d.pic_name ?? '',
  departemen: d.departemen ?? '',
  photo: d.photo,
  trialDocument: d.trial_document,
  trialDocumentName: d.trial_document_name,
  keterangan: d.keterangan,
  createdBy: d.created_by,
  createdAt: d.created_at,
});

export const useStore = create<AppState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  customLineNames: [],
  customDepartments: [],

  fetchRecords: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = (await api.listRecords()) as unknown as DbRecordRow[];
      set({ records: data.map(toRecord), isLoading: false });
    } catch (err) {
      set({ error: errorMessage(err), isLoading: false });
    }
  },

  addRecord: async (record, photoFile) => {
    try {
      const photo = photoFile ? await api.uploadFile('photos', photoFile) : null;

      await api.createRecord({
        line_name: record.lineName,
        date_start: record.dateStart,
        date_finish: record.dateFinish,
        category: record.category,
        henkaten_info: record.henkatenInfo,
        risk_level: record.riskLevel,
        tujuan_henkaten: record.tujuanHenkaten,
        pic_name: record.picName,
        departemen: record.departemen,
        photo,
        created_by: record.createdBy,
      });

      await get().fetchRecords();
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },

  updateRecord: async (id, updatedRecord, newPhotoFile) => {
    try {
      const dbRecord: RecordPatch = {};
      if (updatedRecord.lineName !== undefined) dbRecord.line_name = updatedRecord.lineName;
      if (updatedRecord.dateStart !== undefined) dbRecord.date_start = updatedRecord.dateStart;
      if (updatedRecord.dateFinish !== undefined) dbRecord.date_finish = updatedRecord.dateFinish;
      if (updatedRecord.category !== undefined) dbRecord.category = updatedRecord.category;
      if (updatedRecord.henkatenInfo !== undefined) dbRecord.henkaten_info = updatedRecord.henkatenInfo;
      if (updatedRecord.riskLevel !== undefined) dbRecord.risk_level = updatedRecord.riskLevel;
      if (updatedRecord.tujuanHenkaten !== undefined) dbRecord.tujuan_henkaten = updatedRecord.tujuanHenkaten;
      if (updatedRecord.picName !== undefined) dbRecord.pic_name = updatedRecord.picName;
      if (updatedRecord.departemen !== undefined) dbRecord.departemen = updatedRecord.departemen;
      if (updatedRecord.createdBy !== undefined) dbRecord.created_by = updatedRecord.createdBy;
      if (updatedRecord.keterangan !== undefined) dbRecord.keterangan = updatedRecord.keterangan;

      if (newPhotoFile) {
        dbRecord.photo = await api.uploadFile('photos', newPhotoFile);
      } else if (updatedRecord.photo !== undefined) {
        dbRecord.photo = updatedRecord.photo;
      }

      await api.updateRecord(id, dbRecord);
      await get().fetchRecords();
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },

  deleteRecord: async (id) => {
    try {
      await api.deleteRecord(id);
      set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },

  uploadTrialDocument: async (id, file) => {
    try {
      const url = await api.uploadFile('docs', file);
      await api.updateRecord(id, { trial_document: url, trial_document_name: file.name });
      await get().fetchRecords();
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },

  deleteTrialDocument: async (id) => {
    try {
      await api.updateRecord(id, { trial_document: null, trial_document_name: null });
      await get().fetchRecords();
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },

  fetchOptions: async () => {
    try {
      const { lineNames, departments } = await api.listOptions();
      set({ customLineNames: lineNames, customDepartments: departments });
    } catch (err) {
      console.error(err);
      set({ error: errorMessage(err) });
    }
  },

  addLineName: async (name) => {
    try {
      await api.addLineName(name);
      await get().fetchOptions();
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },

  deleteLineName: async (id) => {
    try {
      await api.deleteLineName(id);
      set((state) => ({ customLineNames: state.customLineNames.filter((c) => c.id !== id) }));
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },

  addDepartment: async (name) => {
    try {
      await api.addDepartment(name);
      await get().fetchOptions();
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },

  deleteDepartment: async (id) => {
    try {
      await api.deleteDepartment(id);
      set((state) => ({ customDepartments: state.customDepartments.filter((c) => c.id !== id) }));
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  },
}));
