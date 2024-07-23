<script setup lang="ts">
import {useRoute} from "vue-router";
import {computed, onMounted, ref} from "vue";
import {CircleCheck, CircleClose, Compass, Tickets} from "@element-plus/icons-vue";
import {api_url} from "@/main";
import axios from "axios";

// 获取路由参数
const route = useRoute()
const studentId = computed(() => route.query.student_id)
const taskId = computed(() => route.query.task_id)


if (studentId.value == "" || taskId.value == "") {
  ElMessage.error('参数有误')
}

const taskReportData = ref(null as any[] | null);


const fetchReportData = async () => {
  if (studentId.value == "" || taskId.value == "") {
    ElMessage.error('参数有误');
    return;
  }

  try {
    const response = await axios.get(`${api_url}/tasks/get_report?student_id=${studentId.value}&task_id=${taskId.value}`);
    taskReportData.value = response.data.data;

    if (Array.isArray(taskReportData.value.TaskData)) {
      taskReportData.value.TaskData.sort((a, b) => a.qa_number - b.qa_number);
    }

  } catch (error) {
    ElMessage.error({
          message: error.response.data.msg,
          duration: 0
        }
    );
  }
};

onMounted(async () => {
  await fetchReportData();
});

const correctAnswersCount = computed(() => {
  if (taskReportData.value && taskReportData.value.TaskData) {
    const taskData = taskReportData.value.TaskData;
    return taskData.filter(item => item.tea_answer === item.stu_answer).length;
  } else {
    return 0;
  }
});


const percentage = computed(() => {
  const taskData = taskReportData.value?.TaskData;
  if (taskData) {
    const taskDataLength = taskData.length;
    return (correctAnswersCount.value / taskDataLength) * 100;
  } else {
    return 0;
  }
});


function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
  const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;

  return `${formattedMinutes}分${formattedSeconds}秒`;
}

</script>

<template>
  <el-scrollbar>
    <el-container style="height:100vh; user-select: none; text-align: center;">
      <el-header v-if="taskReportData" style="height: 458px;">
        <h1 style="padding: 10px">{{ taskReportData.TaskTitle }}</h1>


        <el-progress type="circle" :percentage="percentage" stroke-width="10" width="160" style="padding: 10px">
          <template #default="{ percentage }">
            <span>{{ Number.isInteger(percentage) ? percentage : percentage.toFixed(2) }}%</span>
            <br/>
            <el-tag style="margin-top: 1vw">{{ correctAnswersCount }} / {{ taskReportData.TaskData.length }}</el-tag>
          </template>
        </el-progress>

        <el-card shadow="always">
          正确率
          <br/>
          <!--        后期写了Pc界面专用UI再用这个-->
          <span>{{ Number.isInteger(percentage) ? percentage : percentage.toFixed(2) }}%</span>

          <br/>
          <el-tag>{{ correctAnswersCount }} / {{ taskReportData.TaskData.length }}</el-tag>

        </el-card>
        <el-row class="header_information" style="top:20px">
          <el-col>
          <span class="header_information" style="color: #9ca3af">交卷时间：
            <span style="color: black">{{ taskReportData.FinishTime }}</span>
          </span>
          </el-col>

          <el-col>
        <span style="color: #9ca3af" class="header_information">测试用时：
          <span style="color: black">{{ formatTime(taskReportData.SpendTime) }}</span>
        </span>
          </el-col>
        </el-row>
      </el-header>

      <div>
        <el-header style="text-align: left; height:auto;">
          <el-icon style="color: #457fe0">
            <Tickets/>
          </el-icon>
          答题情况
        </el-header>
        <el-main v-if="taskReportData && taskReportData.TaskData">
          <el-card v-if="taskReportData && taskReportData.TaskData" shadow="hover"
                   v-for="(item, index) in taskReportData.TaskData" :key="item.QaId">
            <div style="text-align: left">
              <p>
                第 {{ index + 1 }} 题：
                <span style="float: right"
                      :class="{ 'correct': item.tea_answer === item.stu_answer, 'incorrect': item.tea_answer !== item.stu_answer }">
                {{ item.tea_answer === item.stu_answer ? '正确' : '错误' }}
                <el-icon v-show="item.tea_answer === item.stu_answer">
                  <CircleCheck/>
                </el-icon>
                <el-icon v-show="item.tea_answer !== item.stu_answer">
                  <CircleClose/>
                </el-icon>
              </span>
              </p>

              <p style="color: #9ca3af">正确答案：<span style="color: black">{{ item.tea_answer }}</span></p>
              <p style="color: #9ca3af">我的答案：<span
                  :class="{ 'correct': item.tea_answer === item.stu_answer, 'incorrect': item.tea_answer !== item.stu_answer }">
                {{ item.stu_answer }}</span></p>

            </div>
          </el-card>

        </el-main>
      </div>
    </el-container>
  </el-scrollbar>
</template>

<!--后期写了PC界面UI再用header_information和percentage-value注释掉的部分-->
<style scoped>

.header_information {
  text-align: left;
  //padding: 1.0667vw;
  //font-size: 4vw;
}

.percentage-value {
  //font-size: 8.5vw;
}

.correct {
  color: green;
}

.incorrect {
  color: red;
}

</style>