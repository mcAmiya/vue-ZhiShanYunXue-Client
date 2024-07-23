import {createRouter, createWebHistory} from 'vue-router'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/zsyx/pages/tasks/detail',
            name: 'taskDetail',
            component: () => import('../views/TaskDetail.vue')
        },
        {
            path: '/zsyx/pages/tasks/get_report',
            name: 'getReport',
            component: () => import('../views/Report.vue')
        },
        {
            path: '/zsyx/pages/tasks/new_task',
            name: 'newTask',
            component: () => import('../views/NewTask.vue')
        },
        {
            path: '/zsyx/pages/tasks/status',
            name: 'taskStatus',
            component: () => import('../views/TaskStatus.vue')
        },
        {
            path: '/zsyx/pages/tasks/check_in',
            name: 'tasksCheckin',
            component: () => import('../views/UserCheckin.vue')
        }
    ]
})

export default router
