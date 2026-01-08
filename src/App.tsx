import React, { useState, useEffect } from 'react';
import { EntryAgGridTable } from './components/EntryAgGridTable';
import { AgGridTable } from './components/AgGridTable';
import { ColDef } from 'ag-grid-community';
import { createEmptyEntryRow } from './utils/entryCalculations';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './components/AgGridTable.css';

// --- Scenario 1: Standard AgGridTable ---
const StandardGridScenario = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [rowData, setRowData] = useState<any[]>([]);

    const colDefs: ColDef[] = [
        { field: "make", flex: 1 },
        { field: "model", flex: 1 },
        { field: "price", flex: 1 }
    ];

    const loadData = () => {
        setTimeout(() => {
            setRowData([
                { make: "Toyota", model: "Celica", price: 35000 },
                { make: "Ford", model: "Mondeo", price: 32000 },
                { make: "Porsche", model: "Boxster", price: 72000 }
            ]);
        }, 500);
    };

    return (
        <div className="scenario-container">
            <h3>Scenario 1: Standard AgGridTable</h3>
            <div className="controls">
                <button onClick={() => setIsVisible(!isVisible)}>
                    {isVisible ? 'Hide Container' : 'Show Container'}
                </button>
                <button onClick={loadData}>Load Data</button>
            </div>
            <div style={{ display: isVisible ? 'block' : 'none' }} className="grid-wrapper-box">
                <div style={{ border: '1px solid gray', padding: 10 }}>
                    <AgGridTable
                        columnDefs={colDefs}
                        rowData={rowData}
                        domLayout="autoHeight"
                    />
                </div>
            </div>
        </div>
    );
};

// --- Scenario 2: EntryAgGridTable (Simulating Bank Transaction Memo Tab) ---
const EntryGridScenario = () => {
    // Mimic the "Memo" tab being hidden initially
    const [activeTab, setActiveTab] = useState<'unmatched' | 'memo'>('unmatched');
    
    // Data state
    const [entryData, setEntryData] = useState<any[]>([]);
    const [transactionId, setTransactionId] = useState<string | null>(null);

    // Simulate selecting a transaction and loading its data
    const loadTransaction = () => {
        const newId = crypto.randomUUID();
        setTransactionId(newId);
        
        // Simulate async data fetching/preparation for the memo tab
        // This often happens BEFORE the user clicks the tab, or while the tab is hidden
        setTimeout(() => {
            const rows = [];
            for(let i=0; i<3; i++) {
                rows.push({
                    ...createEmptyEntryRow(),
                    id: crypto.randomUUID(), 
                    account_number: '1910',
                    amount_eur_excl_vat: 100 * (i+1),
                    description: `Memo Entry ${i+1}`,
                    vat_category_id: 1, 
                    vat_rate: 24,
                    vat_amount: 24 * (i+1),
                    amount_eur_incl_vat: 124 * (i+1)
                });
            }
            setEntryData(rows);
            console.log("Data loaded for transaction:", newId);
        }, 1000);
    };

    return (
        <div className="scenario-container">
            <h3>Scenario 2: Bank Transaction Memo Tab (EntryAgGridTable)</h3>
            
            <div className="controls">
                <button onClick={() => loadTransaction()}>
                    1. Load Transaction (Async)
                </button>
                <div className="tab-switcher">
                    <button 
                        className={activeTab === 'unmatched' ? 'active' : ''}
                        onClick={() => setActiveTab('unmatched')}
                    >
                        Unmatched Docs (Active)
                    </button>
                    <button 
                        className={activeTab === 'memo' ? 'active' : ''}
                        onClick={() => setActiveTab('memo')}
                    >
                        Create Memo (Hidden)
                    </button>
                </div>
            </div>

            <div className="sheet-simulation">
                {/* Unmatched Tab Content */}
                <div style={{ display: activeTab === 'unmatched' ? 'block' : 'none' }}>
                    <div className="dummy-content">
                        <p>This is the "Unmatched Documents" tab content.</p>
                        <p>Switch to "Create Memo" tab to see the grid.</p>
                        <p><strong>Bug Repro:</strong> Click "Load Transaction", wait 1s, then switch tab.</p>
                    </div>
                </div>

                {/* Memo Tab Content (Hidden by display:none when inactive, like Radix UI Tabs) */}
                <div style={{ display: activeTab === 'memo' ? 'block' : 'none' }}>
                    <div className="space-y-4">
                        <h3 className="text-md font-medium">Entries</h3>
                        <div className="ag-grid-entry-wrapper">
                            {/* Mimicking usage in memo-tab.tsx */}
                            <EntryAgGridTable 
                                initialData={entryData}
                                bankTransactionAmount={123.45}
                                isBankTransaction={true}
                                // Force remount on transaction change to mimic key={`entry-table-${id}`}
                                key={`entry-table-${transactionId || 'no-transaction'}`}
                                popupParent={null} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
  const [scenario, setScenario] = useState<'standard' | 'entry'>('entry');

  return (
    <div className="app-container">
      <h1>AG Grid Zero Height Reproduction</h1>
      
      <div className="scenario-selector">
          <button 
            onClick={() => setScenario('standard')}
            className={scenario === 'standard' ? 'active' : ''}
          >
              Standard Scenario
          </button>
          <button 
            onClick={() => setScenario('entry')}
            className={scenario === 'entry' ? 'active' : ''}
          >
              Bank Transaction Scenario
          </button>
      </div>

      <hr />

      {scenario === 'standard' && <StandardGridScenario />}
      {scenario === 'entry' && <EntryGridScenario />}

      <style>{`
        .app-container { padding: 20px; font-family: sans-serif; max-width: 900px; margin: 0 auto; }
        .controls { margin: 20px 0; display: flex; gap: 20px; align-items: center; }
        .scenario-container { border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fff; }
        .grid-wrapper-box { border: 1px solid #ccc; padding: 10px; background: #f9f9f9; }
        
        .tab-switcher { display: flex; gap: 5px; background: #eee; padding: 5px; border-radius: 4px; }
        .tab-switcher button { border: none; background: transparent; padding: 8px 16px; cursor: pointer; border-radius: 4px; }
        .tab-switcher button.active { background: white; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        
        .scenario-selector button { margin-right: 10px; padding: 10px; cursor: pointer; }
        .scenario-selector button.active { font-weight: bold; border: 2px solid blue; }
        
        button { cursor: pointer; padding: 8px 12px; }
        
        .space-y-4 > * + * { margin-top: 1rem; }
        .text-md { font-size: 1.1rem; }
        .font-medium { font-weight: 500; }
        .dummy-content { padding: 40px; text-align: center; color: #666; background: #f5f5f5; border-radius: 8px; }
      `}</style>
    </div>
  );
}

export default App;
