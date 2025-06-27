import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '../../types';

interface UISliceState extends UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
}

const initialState: UISliceState = {
  activeTab: 'interpreter',
  modalOpen: false,
  modalSessionId: null,
  loading: false,
  sidebarOpen: false,
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<'interpreter' | 'history'>) => {
      state.activeTab = action.payload;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modalOpen = true;
      state.modalSessionId = action.payload;
    },
    closeModal: (state) => {
      state.modalOpen = false;
      state.modalSessionId = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

export const {
  setActiveTab,
  openModal,
  closeModal,
  setLoading,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
} = uiSlice.actions;

export default uiSlice.reducer; 