// 利润统计组件
Vue.component('finance-statistics-component', {
    props: {
        systemData: {
            type: Object,
            required: true,
            validator(value) {
                // 验证必要的数据结构
                if (!value) return false;
                if (!Array.isArray(value.sales)) return false;
                if (!Array.isArray(value.products)) return false;
                return true;
            }
        }
    },

    template: `
        <div class="profit-statistics">
            <el-row :gutter="20">
                <!-- 今日利润 -->
                <el-col :span="8">
                    <el-card shadow="hover">
                        <div slot="header">今日利润</div>
                        <div class="amount-text" :class="{'red-text': todayProfit < 0}">
                            ¥{{ todayProfit.toFixed(2) }}
                        </div>
                        <div class="trend-text">
                            <span>同比：</span>
                            <span :class="getTrendClass(todayYearOnYear)">
                                {{ todayYearOnYear }}%
                                <i :class="getTrendIcon(todayYearOnYear)"></i>
                            </span>
                        </div>
                    </el-card>
                </el-col>

                <!-- 本周利润 -->
                <el-col :span="8">
                    <el-card shadow="hover">
                        <div slot="header">本周利润</div>
                        <div class="amount-text" :class="{'red-text': weekProfit < 0}">
                            ¥{{ weekProfit.toFixed(2) }}
                        </div>
                        <div class="trend-text">
                            <span>环比：</span>
                            <span :class="getTrendClass(weekOnWeek)">
                                {{ weekOnWeek }}%
                                <i :class="getTrendIcon(weekOnWeek)"></i>
                            </span>
                        </div>
                    </el-card>
                </el-col>

                <!-- 本月利润 -->
                <el-col :span="8">
                    <el-card shadow="hover">
                        <div slot="header">本月利润</div>
                        <div class="amount-text" :class="{'red-text': monthProfit < 0}">
                            ¥{{ monthProfit.toFixed(2) }}
                        </div>
                        <div class="trend-text">
                            <span>环比：</span>
                            <span :class="getTrendClass(monthOnMonth)">
                                {{ monthOnMonth }}%
                                <i :class="getTrendIcon(monthOnMonth)"></i>
                            </span>
                        </div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- 利润趋势图 -->
            <el-card style="margin-top: 20px;">
                <div ref="profitChart" style="height: 400px;"></div>
            </el-card>
        </div>
    `,

    data() {
        return {
            profitChart: null,
            todayProfit: 0,
            todayYearOnYear: 0,
            weekProfit: 0,
            weekOnWeek: 0,
            monthProfit: 0,
            monthOnMonth: 0,
            isDataReady: false
        }
    },

    methods: {
        // 计算利润数据
        calculateProfits() {
            try {
                const today = new Date();
                
                // 添加调试信息
                console.log('系统数据:', this.systemData);
                console.log('销售数据:', this.systemData?.sales);
                console.log('产品数据:', this.systemData?.products);

                // 确保数据存在
                if (!this.systemData) {
                    console.warn('系统数据未初始化');
                    return;
                }

                // 计算今日利润
                this.todayProfit = this.calculateProfitForPeriod(
                    today,
                    new Date(today.getFullYear(), today.getMonth(), today.getDate())
                );

                // 计算本周利润
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                this.weekProfit = this.calculateProfitForPeriod(today, weekStart);

                // 计算本月利润
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                this.monthProfit = this.calculateProfitForPeriod(today, monthStart);

                // 计算同比环比
                this.calculateTrends();
            } catch (error) {
                console.error('计算利润时出错:', error);
            }
        },

        // 计算指定时期的利润
        calculateProfitForPeriod(endDate, startDate) {
            if (!this.systemData?.sales || !this.systemData?.products) {
                console.warn('缺少销售或商品数据');
                return 0;
            }

            const sales = this.systemData.sales;
            let totalProfit = 0;
            let salesCount = 0;

            sales.forEach(sale => {
                // 安全地处理日期
                let saleDate;
                try {
                    const dateStr = sale.orderDate || sale.date; // 兼容两种日期字段
                    if (dateStr instanceof Date) {
                        saleDate = dateStr;
                    } else if (typeof dateStr === 'string') {
                        saleDate = new Date(dateStr.replace(/-/g, '/'));
                    } else {
                        console.warn('无效的销售日期格式:', dateStr, sale);
                        return;
                    }

                    if (isNaN(saleDate.getTime())) {
                        console.warn('无效的销售日期:', dateStr, sale);
                        return;
                    }

                    // 创建比较用的日期范围
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);

                    if (saleDate >= start && saleDate <= end) {
                        const profit = this.calculateSaleProfit(sale);
                        if (!isNaN(profit)) {
                            totalProfit += profit;
                            salesCount++;
                        }
                    }
                } catch (error) {
                    console.error('处理销售记录时出错:', error, sale);
                }
            });

            console.log(`计算利润: ${startDate} 至 ${endDate}, 共处理 ${salesCount} 笔销售, 总利润: ${totalProfit}`);
            return totalProfit;
        },

        // 计算单个销售订单的利润
        calculateSaleProfit(sale) {
            if (!sale.items || !Array.isArray(sale.items)) {
                console.warn('销售订单缺少商品明细:', sale);
                return 0;
            }

            let totalProfit = 0;
            let hasErrors = false;

            for (const item of sale.items) {
                // 计算销售金额
                const saleAmount = parseFloat(item.amount || (item.price * item.quantity)) || 0;
                if (saleAmount === 0) {
                    console.warn('销售金额为0:', {
                        saleId: sale.id,
                        productId: item.productId,
                        amount: item.amount,
                        price: item.price,
                        quantity: item.quantity
                    });
                }

                // 查找商品并计算成本
                const product = this.systemData.products.find(p => p.id === item.productId);
                if (!product) {
                    console.warn(`未找到商品信息: productId=${item.productId}`);
                    hasErrors = true;
                    continue;
                }

                const purchasePrice = parseFloat(product.purchasePrice);
                const quantity = parseInt(item.quantity);

                if (isNaN(purchasePrice) || isNaN(quantity)) {
                    console.warn('商品数据无效:', {
                        productId: item.productId,
                        purchasePrice,
                        quantity
                    });
                    hasErrors = true;
                    continue;
                }

                const cost = purchasePrice * quantity;
                const itemProfit = saleAmount - cost;
                
                if (itemProfit === 0) {
                    console.warn('商品利润为0:', {
                        saleId: sale.id,
                        productId: item.productId,
                        saleAmount,
                        cost
                    });
                }

                totalProfit += itemProfit;
            }

            if (hasErrors) {
                console.warn('计算销售订单利润时存在错误:', sale);
            }

            return totalProfit;
        },

        // 计算同比环比
        calculateTrends() {
            // 计算去年同期数据
            const lastYear = new Date();
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            const lastYearProfit = this.calculateProfitForPeriod(
                lastYear,
                new Date(lastYear.getFullYear(), lastYear.getMonth(), lastYear.getDate())
            );

            // 计算上周数据
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            const lastWeekProfit = this.calculateProfitForPeriod(
                lastWeek,
                new Date(lastWeek.setDate(lastWeek.getDate() - 7))
            );

            // 计算上月数据
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const lastMonthProfit = this.calculateProfitForPeriod(
                new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
                new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
            );

            // 计算同比环比百分比
            this.todayYearOnYear = this.calculateGrowthRate(this.todayProfit, lastYearProfit);
            this.weekOnWeek = this.calculateGrowthRate(this.weekProfit, lastWeekProfit);
            this.monthOnMonth = this.calculateGrowthRate(this.monthProfit, lastMonthProfit);
        },

        // 计算增长率
        calculateGrowthRate(current, previous) {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / Math.abs(previous) * 100).toFixed(2);
        },

        // 获取趋势样式
        getTrendClass(value) {
            return {
                'green-text': value > 0,
                'red-text': value < 0
            };
        },

        // 获取趋势图标
        getTrendIcon(value) {
            return value > 0 ? 'el-icon-caret-top' : 'el-icon-caret-bottom';
        },

        // 初始化图表
        initChart() {
            this.profitChart = echarts.init(this.$refs.profitChart);
            this.updateChart();
        },

        // 更新图表
        updateChart() {
            if (!this.profitChart) return;

            const option = {
                title: {
                    text: '利润趋势'
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: (params) => {
                        const profit = params[0].value;
                        return `${params[0].name}<br/>利润：¥${profit.toFixed(2)}`;
                    }
                },
                xAxis: {
                    type: 'category',
                    data: this.getLastDays(30)
                },
                yAxis: {
                    type: 'value',
                    name: '利润',
                    axisLabel: {
                        formatter: (value) => `¥${value.toFixed(2)}`
                    }
                },
                series: [{
                    data: this.getDailyProfits(30),
                    type: 'line',
                    name: '日利润',
                    smooth: true,
                    areaStyle: {},
                    itemStyle: {
                        color: '#67C23A'
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [{
                                offset: 0,
                                color: 'rgba(103, 194, 58, 0.3)'
                            }, {
                                offset: 1,
                                color: 'rgba(103, 194, 58, 0.1)'
                            }]
                        }
                    }
                }]
            };

            this.profitChart.setOption(option);
        },

        // 获取最近N天的日期
        getLastDays(n) {
            const dates = [];
            const today = new Date();
            for (let i = n - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                // 使用更标准的日期格式
                dates.push(date.toISOString().split('T')[0]);
            }
            return dates;
        },

        // 获取最近N天的利润数据
        getDailyProfits(n) {
            const profits = [];
            const today = new Date();
            for (let i = n - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                try {
                    const profit = this.calculateProfitForPeriod(
                        new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
                        new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
                    );
                    profits.push(isNaN(profit) ? 0 : profit);
                } catch (error) {
                    console.error('计算日利润时出错:', error);
                    profits.push(0);
                }
            }
            return profits;
        }
    },

    mounted() {
        // 初始化时立即计算利润数据
        if (this.systemData && this.systemData.sales && this.systemData.products) {
            this.calculateProfits();
        } else {
            console.warn('缺少必要的数据:', {
                systemData: !!this.systemData,
                sales: !!this.systemData?.sales,
                products: !!this.systemData?.products
            });
        }

        // 监听数据变化
        this.$watch(
            () => [this.systemData?.sales, this.systemData?.products],
            () => {
                if (this.systemData?.sales && this.systemData?.products) {
                    this.calculateProfits();
                }
            },
            { deep: true }
        );

        // 初始化图表
        this.initChart();
        this.updateChart();

        window.addEventListener('resize', () => this.profitChart?.resize());
        
        // 添加数据变化监听
    },

    beforeDestroy() {
        window.removeEventListener('resize', () => this.profitChart?.resize());
        this.profitChart?.dispose();
    }
}); 