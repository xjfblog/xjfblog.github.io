const Store = {
    state: {
        products: [],
        suppliers: [],
        customers: [],
        purchases: [],
        sales: [],
        purchaseReturns: [],
        salesReturns: [],
        cashFlow: {
            balance: 0,
            records: []
        },
        receivables: {
            records: [],
            total: 0
        },
        payables: {
            total: 0,
            records: []
        }
    },

    config: {
        stockWarningLimit: 10,
        stockDangerLimit: 5,
        autoSaveInterval: 5,
        defaultCustomerCredit: 10000
    },

    // 加载数据
    async loadData() {
        try {
            const data = await DB.loadData();
            if (data) {
                // 恢复数据
                Object.assign(this.state, data.state);
                Object.assign(this.config, data.config);
            }
            return true;
        } catch (error) {
            console.error('加载数据失败:', error);
            return false;
        }
    },

    // 保存数据
    async saveData() {
        try {
            await DB.saveData({
                state: this.state,
                config: this.config
            });
            return true;
        } catch (error) {
            console.error('保存数据失败:', error);
            return false;
        }
    },

    // 导出数据
    exportData() {
        return {
            state: this.state,
            config: this.config
        };
    },

    // 导入数据
    async importData(data) {
        try {
            // 验证数据结构
            if (!data.state || !data.config) {
                throw new Error('无效的数据格式');
            }

            // 导入数据
            Object.assign(this.state, data.state);
            Object.assign(this.config, data.config);

            // 保存到存储
            await this.saveData();
            return true;
        } catch (error) {
            console.error('导入数据失败:', error);
            return false;
        }
    },

    getInitialState() {
        return {
            // ... 其他数据
            cashFlow: {
                balance: 0,
                records: []
            },
            receivables: {
                total: 0,
                records: []
            },
            payables: {
                total: 0,
                records: []
            }
        };
    }
}; 