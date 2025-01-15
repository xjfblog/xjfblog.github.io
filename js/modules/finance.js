// 财务管理模块
Vue.component('finance-component', {
    template: `
        <div class="finance-management">
            <el-card>
                <!-- 财务概览 -->
                <el-row :gutter="20" style="margin-bottom: 20px;">
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">现金余额</div>
                            <div class="amount-text">¥{{ systemData.cashFlow.balance.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">应收账款</div>
                            <div class="amount-text red-text">¥{{ systemData.receivables.total.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">应付账款</div>
                            <div class="amount-text red-text">¥{{ systemData.payables.total.toFixed(2) }}</div>
                        </el-card>
                    </el-col>
                    <el-col :span="6">
                        <el-card shadow="hover">
                            <div slot="header">净资产</div>
                            <div class="amount-text" :class="{'red-text': netAssets < 0}">
                                ¥{{ netAssets.toFixed(2) }}
                            </div>
                        </el-card>
                    </el-col>
                </el-row>

                <!-- 日期筛选 -->
                <el-row style="margin-bottom: 20px;">
                    <el-col :span="8">
                        <el-date-picker
                            v-model="dateRange"
                            type="daterange"
                            range-separator="至"
                            start-placeholder="开始日期"
                            end-placeholder="结束日期"
                            @change="handleDateRangeChange">
                        </el-date-picker>
                    </el-col>
                </el-row>

                <!-- 现金流水记录 -->
                <el-table :data="filteredCashFlow" stripe border>
                    <el-table-column prop="date" label="日期" width="120"></el-table-column>
                    <el-table-column prop="type" label="类型" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="scope.row.type === '收入' ? 'success' : 'danger'">
                                {{ scope.row.type }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="金额" width="120">
                        <template slot-scope="scope">
                            <span :class="{'red-text': scope.row.type === '支出', 'green-text': scope.row.type === '收入'}">
                                ¥{{ scope.row.amount.toFixed(2) }}
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column label="余额" width="120">
                        <template slot-scope="scope">
                            ¥{{ scope.row.balance.toFixed(2) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="relatedType" label="相关业务" width="120"></el-table-column>
                    <el-table-column prop="remark" label="备注"></el-table-column>
                </el-table>

                <!-- 导出按钮 -->
                <div style="margin-top: 20px; text-align: right;">
                    <el-button type="primary" @click="exportFinanceReport">导出财务报表</el-button>
                </div>
            </el-card>

            <!-- 财务分析图表 -->
            <el-card style="margin-top: 20px;">
                <div slot="header">
                    <span>财务分析</span>
                    <el-radio-group 
                        v-model="chartType" 
                        size="small" 
                        style="margin-left: 20px;"
                        @change="updateChart">
                        <el-radio-button label="daily">日统计</el-radio-button>
                        <el-radio-button label="monthly">月统计</el-radio-button>
                    </el-radio-group>
                </div>
                <div ref="chart" style="width: 100%; height: 400px;"></div>
            </el-card>
        </div>
    `,

    props: {
        systemData: {
            type: Object,
            required: true
        }
    },

    data() {
        return {
            dateRange: [],
            chartType: 'daily',
            chart: null
        }
    },

    computed: {
        // 净资产（现金 + 应收 - 应付）
        netAssets() {
            return this.systemData.cashFlow.balance + 
                   this.systemData.receivables.total - 
                   this.systemData.payables.total;
        },

        // 根据日期筛选的现金流水
        filteredCashFlow() {
            if (!this.dateRange.length) {
                return this.systemData.cashFlow.records;
            }

            return this.systemData.cashFlow.records
                .filter(record => this.isDateInRange(record.date))
                .map((record, index, array) => {
                    // 计算每条记录的余额
                    const balance = array
                        .slice(0, index + 1)
                        .reduce((sum, r) => {
                            return sum + (r.type === '收入' ? r.amount : -r.amount);
                        }, 0);
                    return { ...record, balance };
                });
        }
    },

    methods: {
        // 检查日期是否在选择的范围内
        isDateInRange(date) {
            if (!this.dateRange.length) return true;
            const checkDate = new Date(date);
            return checkDate >= this.dateRange[0] && checkDate <= this.dateRange[1];
        },

        // 处理日期范围变化
        handleDateRangeChange() {
            this.updateChart();
        },

        // 初始化图表
        initChart() {
            if (this.chart) {
                this.chart.dispose();
            }
            this.chart = echarts.init(this.$refs.chart);
            this.updateChart();
        },

        // 更新图表数据
        updateChart() {
            if (!this.chart) {
                this.initChart();
                return;
            }

            const records = this.filteredCashFlow;
            const data = {};

            // 按日期分组统计数据
            records.forEach(record => {
                const date = this.chartType === 'monthly' 
                    ? record.date.substring(0, 7)  // YYYY-MM
                    : record.date;                 // YYYY-MM-DD

                if (!data[date]) {
                    data[date] = { income: 0, expense: 0 };
                }

                if (record.type === '收入') {
                    data[date].income += record.amount;
                } else {
                    data[date].expense += record.amount;
                }
            });

            // 准备图表数据
            const dates = Object.keys(data).sort();
            const incomeData = dates.map(date => data[date].income.toFixed(2));
            const expenseData = dates.map(date => data[date].expense.toFixed(2));
            const profitData = dates.map(date => 
                (data[date].income - data[date].expense).toFixed(2)
            );

            // 设置图表选项
            const option = {
                title: {
                    text: this.chartType === 'monthly' ? '月度财务统计' : '日度财务统计'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: (params) => {
                        let result = params[0].name + '<br/>';
                        params.forEach(param => {
                            const marker = param.marker;
                            const value = parseFloat(param.value).toFixed(2);
                            result += marker + param.seriesName + ': ¥' + value + '<br/>';
                        });
                        return result;
                    }
                },
                legend: {
                    data: ['收入', '支出', '利润']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: dates
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: '¥{value}'
                    }
                },
                series: [
                    {
                        name: '收入',
                        type: 'line',
                        data: incomeData,
                        itemStyle: { color: '#67C23A' }
                    },
                    {
                        name: '支出',
                        type: 'line',
                        data: expenseData,
                        itemStyle: { color: '#F56C6C' }
                    },
                    {
                        name: '利润',
                        type: 'line',
                        data: profitData,
                        itemStyle: { color: '#409EFF' }
                    }
                ]
            };

            this.chart.setOption(option);
        },

        // 导出财务报表
        exportFinanceReport() {
            const records = this.filteredCashFlow;
            let csvContent = '\uFEFF'; // 添加BOM以支持中文
            
            // 添加报表标题和日期范围
            csvContent += `财务报表\n`;
            if (this.dateRange.length) {
                csvContent += `统计期间：${this.dateRange[0].toLocaleDateString()} 至 ${this.dateRange[1].toLocaleDateString()}\n`;
            }
            csvContent += '\n';

            // 添加财务概览
            csvContent += `财务概览\n`;
            csvContent += `现金余额,¥${this.systemData.cashFlow.balance.toFixed(2)}\n`;
            csvContent += `应收账款,¥${this.systemData.receivables.total.toFixed(2)}\n`;
            csvContent += `应付账款,¥${this.systemData.payables.total.toFixed(2)}\n`;
            csvContent += `净资产,¥${this.netAssets.toFixed(2)}\n\n`;

            // 添加现金流水明细
            csvContent += `现金流水明细\n`;
            csvContent += `日期,类型,金额,余额,相关业务,备注\n`;
            records.forEach(record => {
                csvContent += `${record.date},${record.type},${record.amount.toFixed(2)},${record.balance.toFixed(2)},${record.relatedType || ''},"${record.remark || ''}"\n`;
            });

            // 添加统计信息
            const totalIncome = records
                .filter(r => r.type === '收入')
                .reduce((sum, r) => sum + r.amount, 0);
            const totalExpense = records
                .filter(r => r.type === '支出')
                .reduce((sum, r) => sum + r.amount, 0);

            csvContent += `\n统计信息\n`;
            csvContent += `总收入,¥${totalIncome.toFixed(2)}\n`;
            csvContent += `总支出,¥${totalExpense.toFixed(2)}\n`;
            csvContent += `净收入,¥${(totalIncome - totalExpense).toFixed(2)}\n`;

            // 创建并下载文件
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `财务报表_${new Date().toLocaleDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    },

    // 添加生命周期钩子
    mounted() {
        this.initChart();
        window.addEventListener('resize', this.chart?.resize);
    },

    beforeDestroy() {
        window.removeEventListener('resize', this.chart?.resize);
        this.chart?.dispose();
    }
}) 