import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MobileUnitType = 'xray' | 'ultrasound' | 'both'
export type MobileUnitStatus = 'available' | 'assigned' | 'imaging' | 'offline'

export interface MobileUnit {
  id: string
  name: string
  type: MobileUnitType
  status: MobileUnitStatus
  currentAssignment?: string  // Assessment ID
  assignedAt?: Date
}

interface MobileUnitState {
  units: MobileUnit[]
  isLoading: boolean
  error: string | null

  // Actions
  addUnit: (unit: Omit<MobileUnit, 'id'>) => string
  updateUnit: (id: string, data: Partial<MobileUnit>) => void
  deleteUnit: (id: string) => void
  assignUnit: (unitId: string, assessmentId: string) => void
  unassignUnit: (unitId: string) => void
  startImaging: (unitId: string) => void
  completeImaging: (unitId: string) => void
  setOffline: (unitId: string) => void
  setAvailable: (unitId: string) => void
  getUnitById: (id: string) => MobileUnit | undefined
  getAvailableUnits: (type?: MobileUnitType) => MobileUnit[]
  getUnitByAssignment: (assessmentId: string) => MobileUnit | undefined
}

export const useMobileUnitStore = create<MobileUnitState>()(
  persist(
    (set, get) => ({
      units: [],
      isLoading: false,
      error: null,

      addUnit: (unitData) => {
        const id = crypto.randomUUID()
        const newUnit: MobileUnit = {
          ...unitData,
          id,
          status: unitData.status || 'available',
        }
        set((state) => ({
          units: [...state.units, newUnit],
          error: null,
        }))
        return id
      },

      updateUnit: (id, data) => {
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === id ? { ...unit, ...data } : unit
          ),
          error: null,
        }))
      },

      deleteUnit: (id) => {
        set((state) => ({
          units: state.units.filter((unit) => unit.id !== id),
          error: null,
        }))
      },

      assignUnit: (unitId, assessmentId) => {
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  status: 'assigned' as MobileUnitStatus,
                  currentAssignment: assessmentId,
                  assignedAt: new Date(),
                }
              : unit
          ),
          error: null,
        }))
      },

      unassignUnit: (unitId) => {
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  status: 'available' as MobileUnitStatus,
                  currentAssignment: undefined,
                  assignedAt: undefined,
                }
              : unit
          ),
          error: null,
        }))
      },

      startImaging: (unitId) => {
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? { ...unit, status: 'imaging' as MobileUnitStatus }
              : unit
          ),
          error: null,
        }))
      },

      completeImaging: (unitId) => {
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  status: 'available' as MobileUnitStatus,
                  currentAssignment: undefined,
                  assignedAt: undefined,
                }
              : unit
          ),
          error: null,
        }))
      },

      setOffline: (unitId) => {
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  status: 'offline' as MobileUnitStatus,
                  currentAssignment: undefined,
                  assignedAt: undefined,
                }
              : unit
          ),
          error: null,
        }))
      },

      setAvailable: (unitId) => {
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? { ...unit, status: 'available' as MobileUnitStatus }
              : unit
          ),
          error: null,
        }))
      },

      getUnitById: (id) => {
        return get().units.find((unit) => unit.id === id)
      },

      getAvailableUnits: (type) => {
        return get().units.filter((unit) => {
          if (unit.status !== 'available') return false
          if (!type) return true
          // 'both' type units can handle xray or ultrasound requests
          if (unit.type === 'both') return true
          if (type === 'both') return true
          return unit.type === type
        })
      },

      getUnitByAssignment: (assessmentId) => {
        return get().units.find((unit) => unit.currentAssignment === assessmentId)
      },
    }),
    {
      name: 'mobile-units-storage',
      partialize: (state) => ({ units: state.units }),
    }
  )
)
