import { getSupabase } from './supabase/client';

interface SupabaseQueryOptions {
    select?: string;
    eq?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    single?: boolean;
    gte?: { column: string; value: any };
}

export const supabaseFetcher = async (key: string | [string, SupabaseQueryOptions]) => {
    const supabase = getSupabase();

    if (typeof key === 'string') {
        const { data, error } = await supabase.from(key).select('*');
        if (error) throw error;
        return data;
    }

    const [table, options] = key;
    let supabaseQuery = supabase.from(table).select(options.select || '*');

    if (options.eq) {
        Object.entries(options.eq).forEach(([col, val]) => {
            supabaseQuery = supabaseQuery.eq(col, val);
        });
    }

    if (options.gte) {
        supabaseQuery = supabaseQuery.gte(options.gte.column, options.gte.value);
    }

    if (options.order) {
        supabaseQuery = supabaseQuery.order(options.order.column, {
            ascending: options.order.ascending ?? false
        });
    }

    if (options.limit) {
        supabaseQuery = supabaseQuery.limit(options.limit);
    }

    if (options.single) {
        const { data, error } = await supabaseQuery.single();
        if (error) throw error;
        return data;
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;
    return data;
};

export const apiFetcher = (url: string) => fetch(url).then(res => res.json()).then(data => {
    if (data.success === false) throw new Error(data.error || 'API Error');
    return data.data;
});
