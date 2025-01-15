// 主程序入口
document.addEventListener('DOMContentLoaded', function() {
    Vue.use(ELEMENT);  // 注册 Element UI
    
    new Vue({
        el: '#app',
        data() {
            return {
                systemData: Store.state,
                systemConfig: Store.config,
                currentComponent: 'dashboard-component',
                activeIndex: '0',
                isMobile: window.innerWidth <= 768,
                showMenu: false
            }
        },
        
        async created() {
            // 初始化数据
            await DB.init();
            await Store.loadData();
            
            // 确保所有必要的数据结构都存在
            if (!this.systemData.products) this.systemData.products = [];
            if (!this.systemData.suppliers) this.systemData.suppliers = [];
            if (!this.systemData.customers) this.systemData.customers = [];
            if (!this.systemData.purchases) this.systemData.purchases = [];
            if (!this.systemData.sales) this.systemData.sales = [];
            if (!this.systemData.purchaseReturns) this.systemData.purchaseReturns = [];
            if (!this.systemData.salesReturns) this.systemData.salesReturns = [];
            
            // 初始化财务相关数据
            if (!this.systemData.cashFlow) {
                this.systemData.cashFlow = {
                    balance: 0,
                    records: []
                };
            }
            if (!this.systemData.receivables) {
                this.systemData.receivables = {
                    records: [],
                    total: 0
                };
            }
            if (!this.systemData.payables) {
                this.systemData.payables = {
                    records: [],
                    total: 0
                };
            }

            // 打印初始化状态
            console.log('系统数据初始化完成:', {
                products: this.systemData.products.length,
                sales: this.systemData.sales.length,
                cashFlow: this.systemData.cashFlow.records.length
            });

            // 设置自动保存和窗口大小监听
            this.setupAutoSave();
            window.addEventListener('resize', this.handleResize);
        },
        
        beforeDestroy() {
            window.removeEventListener('resize', this.handleResize);
        },
        
        methods: {
            // 处理菜单选择
            handleSelect(key, keyPath) {
                switch(key) {
                    case '0':
                        this.currentComponent = 'dashboard-component';
                        break;
                    case '1-1':
                        this.currentComponent = 'product-component';
                        break;
                    case '1-2':
                        this.currentComponent = 'supplier-component';
                        break;
                    case '1-3':
                        this.currentComponent = 'customer-component';
                        break;
                    case '2-1':
                        this.currentComponent = 'purchase-order-component';
                        break;
                    case '2-2':
                        this.currentComponent = 'purchase-return-component';
                        break;
                    case '2-3':
                        this.currentComponent = 'supplier-bill-component';
                        break;
                    case '3-1':
                        this.currentComponent = 'sales-order-component';
                        break;
                    case '3-2':
                        this.currentComponent = 'sales-return-component';
                        break;
                    case '3-3':
                        this.currentComponent = 'customer-bill-component';
                        break;
                    case '4-1':
                        this.currentComponent = 'inventory-query-component';
                        break;
                    case '4-2':
                        this.currentComponent = 'inventory-check-component';
                        break;
                    case '4-3':
                        this.currentComponent = 'inventory-warning-component';
                        break;
                    case '4-4':
                        this.currentComponent = 'inventory-history-component';
                        break;
                    case '5-1':
                        this.currentComponent = 'cash-flow-component';
                        break;
                    case '5-2':
                        this.currentComponent = 'finance-statistics-component';
                        break;
                    case '5-3':
                        this.currentComponent = 'receivables-component';
                        break;
                    case '5-4':
                        this.currentComponent = 'payables-component';
                        break;
                    case '5-5':
                        this.currentComponent = 'finance-report-component';
                        break;
                }
            },

            // 设置自动保存
            setupAutoSave() {
                setInterval(() => {
                    Store.saveData();
                }, this.systemConfig.autoSaveInterval * 60 * 1000);
            },

            // 手动保存数据
            async saveToLocalStorage() {
                if (await Store.saveData()) {
                    this.$message.success('数据保存成功！');
                } else {
                    this.$message.error('数据保存失败！');
                }
            },

            // 导出数据
            exportData() {
                try {
                    const backup = Store.exportData();
                    const blob = new Blob([JSON.stringify(backup, null, 2)], 
                        { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `erp_backup_${moment().format('YYYY-MM-DD_HH-mm')}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    this.$message.success('数据导出成功！');
                } catch (error) {
                    this.$message.error('导出失败：' + error.message);
                }
            },

            // 触发导入文件选择
            triggerImport() {
                this.$refs.fileInput.click();
            },

            // 导入数据
            async importData(event) {
                const file = event.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const backup = JSON.parse(e.target.result);
                        if (await Store.importData(backup)) {
                            this.systemData = Store.state;
                            this.systemConfig = Store.config;
                            this.$message.success('数据导入成功！');
                        } else {
                            this.$message.error('数据导入失败！');
                        }
                    } catch (error) {
                        this.$message.error('导入失败：' + error.message);
                    }
                };
                reader.readAsText(file);
                event.target.value = '';
            },

            // 处理组件数据变化
            handleDataChange() {
                Store.saveData();
            },

            handleResize() {
                this.isMobile = window.innerWidth <= 768;
                if (!this.isMobile) {
                    this.showMenu = false;
                }
            },
            
            toggleMenu() {
                this.showMenu = !this.showMenu;
            }
        }
    });
});

// 全局错误处理
Vue.config.errorHandler = function(err, vm, info) {
    console.error('Vue Error:', err);
    vm.$notify.error({
        title: '系统错误',
        message: err.message,
        duration: 0
    });
}; 