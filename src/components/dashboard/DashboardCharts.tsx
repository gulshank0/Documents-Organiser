'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartBarIcon, ChartPieIcon } from '@heroicons/react/24/outline';

const DEPARTMENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

interface ChartData {
  name: string;
  value: number;
}

// Custom tooltip for better styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
        <p className="font-medium text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Documents: <span className="font-semibold text-blue-600 dark:text-blue-400">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Custom pie chart label
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null; // Hide labels for slices less than 5%
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-xs font-medium drop-shadow-sm"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DashboardCharts() {
  const [departmentData, setDepartmentData] = useState<ChartData[]>([]);
  const [statusData, setStatusData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard-data');
        const data = await response.json();
        
        // Transform department data for charts
        const deptData: ChartData[] = Object.entries(data.by_department || {}).map(([dept, count]) => ({
          name: dept,
          value: Number(count)
        }));
        
        const statusData: ChartData[] = Object.entries(data.by_status || {}).map(([status, count]) => ({
          name: status,
          value: Number(count)
        }));
        
        setDepartmentData(deptData);
        setStatusData(statusData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalDepartmentDocs = departmentData.reduce((sum, item) => sum + item.value, 0);
  const totalStatusDocs = statusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8"
      >
        {/* Department Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-slate-900 dark:via-blue-950/10 dark:to-slate-900 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <ChartPieIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                      Department Distribution
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Documents across departments
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs px-3 py-1 rounded-full">
                  {totalDepartmentDocs} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={90}
                      innerRadius={35}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={2}
                    >
                      {departmentData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ 
                        paddingTop: '20px',
                        fontSize: '12px'
                      }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Department Summary */}
              <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="grid grid-cols-2 gap-4">
                  {departmentData.slice(0, 4).map((dept, index) => (
                    <div key={dept.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: DEPARTMENT_COLORS[index] }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {dept.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {dept.value} docs ({((dept.value / totalDepartmentDocs) * 100).toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Processing Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full bg-gradient-to-br from-white via-green-50/20 to-white dark:from-slate-900 dark:via-green-950/10 dark:to-slate-900 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <ChartBarIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                      Processing Status
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Document processing progress
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs px-3 py-1 rounded-full">
                  {totalStatusDocs} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="rgba(148, 163, 184, 0.2)"
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    className="hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Status Summary */}
              <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex flex-wrap gap-3">
                  {statusData.map((status, index) => (
                    <div key={status.name} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                        {status.name}: {status.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}