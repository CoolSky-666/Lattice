import { useState, useCallback, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Download, Check, RotateCcw, Grid3X3, Plus, Copy as CopyIcon, Globe, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import './App.css';

type CellType = 'fuel' | 'tube' | 'poison';
type Mode = 'select-tube' | 'select-poison';
type Language = 'zh' | 'en';

interface Scheme {
  id: string;
  name: string;
  nameEn: string;
  tubes: Set<string>;
  poisons: Set<string>;
}

// Default tube layout
const defaultTubeX = [5, 8, 11, 3, 13, 2, 5, 8, 11, 14, 2, 5, 8, 11, 14, 2, 5, 8, 11, 14, 3, 13, 5, 8, 11];
const defaultTubeY = [2, 2, 2, 3, 3, 5, 5, 5, 5, 5, 8, 8, 8, 8, 8, 11, 11, 11, 11, 11, 13, 13, 14, 14, 14];

// Translations
const translations = {
  zh: {
    title: '燃料组件构建工具',
    subtitle: '核反应堆燃料组件可视化配置系统',
    gridSize: '网格大小:',
    generate: '生成',
    symmetry: '1/8对称:',
    mode: '模式:',
    selectTube: '选择导向管',
    selectPoison: '选择毒物棒',
    reset: '重置',
    export: '导出',
    stats: '组件统计',
    fuelRod: '燃料棒',
    tube: '导向管',
    poison: '毒物棒',
    total: '总计',
    exportResult: '导出结果',
    copy: '复制',
    copied: '已复制',
    scheme: '方案',
    defaultScheme: '默认方案',
    newScheme: '新建方案',
    copyScheme: '复制方案',
    deleteScheme: '删除方案',
    enterOddNumber: '请输入3-50之间的奇数',
    exportFirst: '请先导出数据',
    copyFailed: '复制失败',
    exportSuccess: '导出成功',
    resetSuccess: '已重置',
  },
  en: {
    title: 'Fuel Assembly Builder',
    subtitle: 'Nuclear Reactor Fuel Assembly Config System',
    gridSize: 'Grid Size:',
    generate: 'Generate',
    symmetry: '1/8 Symmetry:',
    mode: 'Mode:',
    selectTube: 'Select Tube',
    selectPoison: 'Select Poison',
    reset: 'Reset',
    export: 'Export',
    stats: 'Statistics',
    fuelRod: 'Fuel Rod',
    tube: 'Tube',
    poison: 'Poison',
    total: 'Total',
    exportResult: 'Export Result',
    copy: 'Copy',
    copied: 'Copied',
    scheme: 'Scheme',
    defaultScheme: 'Default',
    newScheme: 'New Scheme',
    copyScheme: 'Copy Scheme',
    deleteScheme: 'Delete',
    enterOddNumber: 'Enter odd number (3-50)',
    exportFirst: 'Please export first',
    copyFailed: 'Copy failed',
    exportSuccess: 'Export success',
    resetSuccess: 'Reset success',
  }
};

function createDefaultTubes(): Set<string> {
  const tubes = new Set<string>();
  for (let i = 0; i < defaultTubeX.length; i++) {
    tubes.add(`${defaultTubeX[i]},${defaultTubeY[i]}`);
  }
  return tubes;
}

function App() {
  const [lang, setLang] = useState<Language>('zh');
  const t = translations[lang];

  const [gridSize, setGridSize] = useState<number>(17);
  const [inputGridSize, setInputGridSize] = useState<string>('17');
  const [symmetry, setSymmetry] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>('select-tube');
  
  // Schemes management
  const [schemes, setSchemes] = useState<Scheme[]>([
    { id: '1', name: '默认方案', nameEn: 'Default', tubes: createDefaultTubes(), poisons: new Set() }
  ]);
  const [activeSchemeId, setActiveSchemeId] = useState<string>('1');
  const [nextSchemeId, setNextSchemeId] = useState<number>(2);
  
  const [exportText, setExportText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const activeScheme = schemes.find(s => s.id === activeSchemeId) || schemes[0];
  const tubes = activeScheme.tubes;
  const poisons = activeScheme.poisons;

  const center = useMemo(() => (gridSize - 1) / 2, [gridSize]);

  // Generate symmetric positions for 1/8 symmetry
  const getSymmetricPositions = useCallback((x: number, y: number): [number, number][] => {
    if (!symmetry) return [[x, y]];

    const positions: [number, number][] = [];
    const dx = x - center;
    const dy = y - center;

    const symmetries = [
      [dx, dy],
      [dy, dx],
      [-dy, dx],
      [-dx, dy],
      [-dx, -dy],
      [-dy, -dx],
      [dy, -dx],
      [dx, -dy],
    ];

    const seen = new Set<string>();
    for (const [sdx, sdy] of symmetries) {
      const sx = center + sdx;
      const sy = center + sdy;
      const key = `${sx},${sy}`;
      if (sx >= 0 && sx < gridSize && sy >= 0 && sy < gridSize && !seen.has(key)) {
        positions.push([sx, sy]);
        seen.add(key);
      }
    }

    return positions;
  }, [symmetry, center, gridSize]);

  const updateActiveScheme = useCallback((updates: Partial<Scheme>) => {
    setSchemes(prev => prev.map(s => 
      s.id === activeSchemeId ? { ...s, ...updates } : s
    ));
  }, [activeSchemeId]);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (mode === 'select-tube') {
      const symmetricPositions = getSymmetricPositions(x, y);
      const hasAnyTube = symmetricPositions.some(([sx, sy]) => 
        tubes.has(`${sx},${sy}`)
      );

      const newTubes = new Set(tubes);
      if (hasAnyTube) {
        symmetricPositions.forEach(([sx, sy]) => {
          newTubes.delete(`${sx},${sy}`);
        });
      } else {
        symmetricPositions.forEach(([sx, sy]) => {
          newTubes.add(`${sx},${sy}`);
        });
      }
      updateActiveScheme({ tubes: newTubes });
    } else if (mode === 'select-poison') {
      const symmetricPositions = getSymmetricPositions(x, y);
      const hasAnyPoison = symmetricPositions.some(([sx, sy]) => 
        poisons.has(`${sx},${sy}`)
      );

      const newPoisons = new Set(poisons);
      if (hasAnyPoison) {
        symmetricPositions.forEach(([sx, sy]) => {
          newPoisons.delete(`${sx},${sy}`);
        });
      } else {
        symmetricPositions.forEach(([sx, sy]) => {
          newPoisons.add(`${sx},${sy}`);
        });
      }
      updateActiveScheme({ poisons: newPoisons });
    }
  }, [mode, tubes, poisons, getSymmetricPositions, updateActiveScheme]);

  const getCellType = useCallback((x: number, y: number): CellType => {
    const key = `${x},${y}`;
    if (tubes.has(key)) return 'tube';
    if (poisons.has(key)) return 'poison';
    return 'fuel';
  }, [tubes, poisons]);

  const handleGridSizeChange = () => {
    const size = parseInt(inputGridSize);
    if (size >= 3 && size <= 50 && size % 2 === 1) {
      setGridSize(size);
      // Reset all schemes when grid size changes
      setSchemes(prev => prev.map(s => ({ ...s, tubes: new Set(), poisons: new Set() })));
      setExportText('');
    } else {
      toast.error(t.enterOddNumber);
    }
  };

  const handleReset = () => {
    updateActiveScheme({ tubes: new Set(), poisons: new Set() });
    setExportText('');
    toast.success(t.resetSuccess);
  };

  const handleNewScheme = () => {
    const newId = String(nextSchemeId);
    const newScheme: Scheme = {
      id: newId,
      name: `${t.scheme}${nextSchemeId}`,
      nameEn: `Scheme ${nextSchemeId}`,
      tubes: new Set(),
      poisons: new Set()
    };
    setSchemes(prev => [...prev, newScheme]);
    setActiveSchemeId(newId);
    setNextSchemeId(prev => prev + 1);
  };

  const handleCopyScheme = () => {
    const newId = String(nextSchemeId);
    const newScheme: Scheme = {
      id: newId,
      name: `${activeScheme.name} (${t.copyScheme})`,
      nameEn: `${activeScheme.nameEn} (Copy)`,
      tubes: new Set(activeScheme.tubes),
      poisons: new Set(activeScheme.poisons)
    };
    setSchemes(prev => [...prev, newScheme]);
    setActiveSchemeId(newId);
    setNextSchemeId(prev => prev + 1);
  };

  const handleDeleteScheme = (schemeId: string) => {
    if (schemes.length <= 1) {
      toast.error(lang === 'zh' ? '至少保留一个方案' : 'Keep at least one scheme');
      return;
    }
    setSchemes(prev => prev.filter(s => s.id !== schemeId));
    if (activeSchemeId === schemeId) {
      setActiveSchemeId(schemes.find(s => s.id !== schemeId)?.id || '1');
    }
  };

  const handleExport = () => {
    let exportCode = '';
    
    schemes.forEach((scheme, index) => {
      const suffix = schemes.length > 1 ? `${index + 1}` : '';
      
      const tubeList: [number, number][] = [];
      const poisonList: [number, number][] = [];

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const key = `${x},${y}`;
          if (scheme.tubes.has(key)) {
            tubeList.push([x, y]);
          } else if (scheme.poisons.has(key)) {
            poisonList.push([x, y]);
          }
        }
      }

      tubeList.sort((a, b) => a[1] === b[1] ? a[0] - b[0] : a[1] - b[1]);
      poisonList.sort((a, b) => a[1] === b[1] ? a[0] - b[0] : a[1] - b[1]);

      const tubeX = tubeList.map(p => p[0]);
      const tubeY = tubeList.map(p => p[1]);
      const poisonX = poisonList.map(p => p[0]);
      const poisonY = poisonList.map(p => p[1]);

      if (index > 0) exportCode += '\n\n';
      exportCode += `tube_x${suffix} = [${tubeX.join(', ')}]\ntube_y${suffix} = [${tubeY.join(', ')}]\n\npois_x${suffix} = [${poisonX.join(', ')}]\npois_y${suffix} = [${poisonY.join(', ')}]`;
    });

    setExportText(exportCode);
    toast.success(t.exportSuccess);
  };

  const handleCopy = async () => {
    if (!exportText) {
      toast.error(t.exportFirst);
      return;
    }
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      toast.success(t.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.copyFailed);
    }
  };

  const fuelCount = gridSize * gridSize - tubes.size - poisons.size;

  const gridCells = useMemo(() => {
    const cells: { x: number; y: number; type: CellType }[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        cells.push({ x, y, type: getCellType(x, y) });
      }
    }
    return cells;
  }, [gridSize, getCellType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-slate-400 mt-1">{t.subtitle}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="border-slate-600 hover:bg-slate-700 text-blue-400"
          >
            <Globe className="w-4 h-4 mr-1" />
            {lang === 'zh' ? 'EN' : '中文'}
          </Button>
        </div>

        {/* Control Panel */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Grid Size Input */}
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{t.gridSize}</span>
                <Input
                  type="number"
                  value={inputGridSize}
                  onChange={(e) => setInputGridSize(e.target.value)}
                  className="w-20 bg-slate-700 border-slate-600 text-white"
                  min={3}
                  max={50}
                  step={2}
                />
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleGridSizeChange}
                >
                  {t.generate}
                </Button>
              </div>

              <div className="w-px h-8 bg-slate-600" />

              {/* Symmetry Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{t.symmetry}</span>
                <Switch
                  checked={symmetry}
                  onCheckedChange={setSymmetry}
                />
              </div>

              <div className="w-px h-8 bg-slate-600" />

              {/* Mode Selection */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">{t.mode}</span>
                <div className="flex gap-1">
                  <Button
                    variant={mode === 'select-tube' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('select-tube')}
                    className={mode === 'select-tube' ? 'bg-blue-600' : 'border-slate-600'}
                  >
                    {t.selectTube}
                  </Button>
                  <Button
                    variant={mode === 'select-poison' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('select-poison')}
                    className={mode === 'select-poison' ? 'bg-emerald-600' : 'border-slate-600'}
                  >
                    {t.selectPoison}
                  </Button>
                </div>
              </div>

              <div className="flex-1" />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="border-slate-600 hover:bg-slate-700"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t.reset}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExport}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Download className="w-4 h-4 mr-1" />
                  {t.export}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Grid Area */}
          <div className="flex-1">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-6">
                <div 
                  className="grid gap-1 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    maxWidth: `${Math.min(gridSize * 32, 600)}px`,
                  }}
                >
                  {gridCells.map((cell) => {
                    const isTube = cell.type === 'tube';
                    const isPoison = cell.type === 'poison';

                    return (
                      <div
                        key={`${cell.x}-${cell.y}`}
                        className={`
                          aspect-square flex items-center justify-center cursor-pointer
                          rounded-sm transition-all duration-150 hover:scale-110
                          ${isTube ? 'bg-amber-500/20' : isPoison ? 'bg-emerald-500/20' : 'bg-slate-700/50'}
                        `}
                        onClick={() => handleCellClick(cell.x, cell.y)}
                        title={`(${cell.x}, ${cell.y})`}
                      >
                        {isTube ? (
                          <div className="w-3/4 h-3/4 rounded-full border-3 border-amber-500 bg-transparent" />
                        ) : isPoison ? (
                          <div className="w-2/3 h-2/3 rounded-full bg-emerald-500" />
                        ) : (
                          <div className="w-2/3 h-2/3 rounded-full bg-blue-400/60 hover:bg-blue-400 transition-colors" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-400/60" />
                    <span className="text-slate-300">{t.fuelRod}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 bg-transparent" />
                    <span className="text-slate-300">{t.tube}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500" />
                    <span className="text-slate-300">{t.poison}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="w-64 space-y-4">
            {/* Stats Panel */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur sticky top-4">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-4 text-slate-200">{t.stats}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400" />
                      <span className="text-slate-300">{t.fuelRod}</span>
                    </div>
                    <span className="text-xl font-bold text-blue-400">{fuelCount}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-amber-500 bg-transparent" />
                      <span className="text-slate-300">{t.tube}</span>
                    </div>
                    <span className="text-xl font-bold text-amber-400">{tubes.size}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-slate-300">{t.poison}</span>
                    </div>
                    <span className="text-xl font-bold text-emerald-400">{poisons.size}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t.total}</span>
                      <span className="text-lg font-bold text-white">{gridSize * gridSize}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheme Selector */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-200">{t.scheme}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:text-white"
                      onClick={handleNewScheme}
                      title={t.newScheme}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:text-white"
                      onClick={handleCopyScheme}
                      title={t.copyScheme}
                    >
                      <CopyIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between border-slate-600 bg-slate-700/50"
                    >
                      <span>{lang === 'zh' ? activeScheme.name : activeScheme.nameEn}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700">
                    {schemes.map((scheme) => (
                      <DropdownMenuItem
                        key={scheme.id}
                        className={`flex items-center justify-between cursor-pointer text-white ${
                          scheme.id === activeSchemeId ? 'bg-blue-500/20' : 'hover:bg-slate-700'
                        }`}
                        onClick={() => setActiveSchemeId(scheme.id)}
                      >
                        <span className="text-white">{lang === 'zh' ? scheme.name : scheme.nameEn}</span>
                        {schemes.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScheme(scheme.id);
                            }}
                          >
                            {t.deleteScheme}
                          </Button>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Export Area */}
        {exportText && (
          <Card className="mt-6 bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-200">{t.exportResult}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="border-slate-600 hover:bg-slate-700"
                >
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? t.copied : t.copy}
                </Button>
              </div>
              <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-300">
                {exportText}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;
