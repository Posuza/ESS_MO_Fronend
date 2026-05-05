import { API_URL, API_CONFIG } from "../config/api.config";
import type { SectorReport, SectorReportFilters } from "../store/Slice/sectorReportSlice";

export interface SectorReportCreate {
    sector_id: number;
    leave_sick_count: number;
    leave_business_count: number;
    leave_other_count: number;
    absent_count: number;
    shift_18_count: number;
    shift_24_count: number;
    shift_36_count: number;
    rule_sleep_count?: number;
    rule_use_phone_count?: number;
    rule_no_card_count?: number;
    warning?: string;
    wear_hat_count: number;
    wear_shirt_count: number;
    wear_pant_count: number;
    wear_shoe_count: number;
    other_Job?: string;
    other_Job_count?: number;
    other_training?: string;
    other_training_count?: number;
    other_extral?: string;
    // Server auto-assigns approval/audit fields from actor headers.
    approved_by?: string;
    created_by?: string;
}

export const sectorReportService = {
    async getAll(filters?: SectorReportFilters): Promise<SectorReport[]> {
        try {
            const queryParams = new URLSearchParams();
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        queryParams.append(key, String(value));
                    }
                });
            }
            const queryString = queryParams.toString();
            const url = `${API_URL}/sector-reports/${queryString ? `?${queryString}` : ''}`;
            
            console.log("📡 Fetching sector reports from:", url);
            const response = await fetch(url, {
                ...API_CONFIG,
                headers: {
                    ...API_CONFIG.headers,
                    ...API_CONFIG.getAuthHeader()
                }
            });
            console.log("✅ Response status:", response.status);
            if (!response.ok) throw new Error('Failed to fetch sector reports');
            return response.json();
        } catch (error) {
            console.error("❌ Error fetching sector reports:", error);
            throw error;
        }
    },


    async getById(id: number): Promise<SectorReport> {
        const response = await fetch(`${API_URL}/sector-reports/${id}`, {
            ...API_CONFIG,
            headers: {
                ...API_CONFIG.headers,
                ...API_CONFIG.getAuthHeader()
            }
        });
        if (!response.ok) throw new Error('Failed to fetch sector report');
        return response.json();
    },

    async create(data: SectorReportCreate): Promise<SectorReport> {
        const response = await fetch(`${API_URL}/sector-reports/`, {
            method: 'POST',
            ...API_CONFIG,
            headers: {
                ...API_CONFIG.headers,
                ...API_CONFIG.getAuthHeader()
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create sector report');
        return response.json();
    },

    async update(id: number, data: Partial<SectorReport>): Promise<SectorReport> {
        const response = await fetch(`${API_URL}/sector-reports/${id}`, {
            method: 'PATCH',
            ...API_CONFIG,
            headers: {
                ...API_CONFIG.headers,
                ...API_CONFIG.getAuthHeader()
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update sector report');
        return response.json();
    },

    async delete(id: number): Promise<void> {
        const response = await fetch(`${API_URL}/sector-reports/${id}`, {
            method: 'DELETE',
            ...API_CONFIG,
            headers: {
                ...API_CONFIG.headers,
                ...API_CONFIG.getAuthHeader()
            }
        });
        if (!response.ok) throw new Error('Failed to delete sector report');
    },
};
