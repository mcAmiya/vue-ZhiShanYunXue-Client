<template>
  <el-container>
    <el-header style="margin: 10px;">
      <p v-if="taskData">任务标题：{{ taskData?.task_title }}</p>
      <p v-if="detailData && taskData">总正确率：{{
          detailData ? ((detailData.totalCorrectValue / detailData.totalCountValue * 100).toFixed(2)) + '%' : '数据加载中...'
        }}</p>
      <p v-if="taskData">提交人数：{{ taskData?.studentAnswer?.length || '数据加载中...' }}</p>
    </el-header>
    <el-main>
      <div ref="chartRef" style="width: 100%; height: 85vh;"></div>
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import {ref, onMounted, inject, computed, onUnmounted} from "vue";
import {useRoute} from "vue-router";
import axios from "axios";
import {api_url} from "@/main";

const echarts = inject("echarts");
const chartRef = ref<HTMLDivElement | null>(null);

interface AnswerItem {
  qa_id: string;
  answer: string;
}

interface StudentAnswer {
  user_id: string;
  answers: AnswerItem[];
}

interface TaskData {
  task_title: string;
  correctAnswer: AnswerItem[];
  studentAnswer: StudentAnswer[];
}

const route = useRoute();
const taskId = computed(() => route.query.task_id);


const taskData = ref<TaskData>();

// 30秒 刷新一次
const flashDataTime = 30 * 1000;

const fetchStatusData = async () => {
      if (taskId.value == "") {
        ElMessage.error('参数有误');
        return;
      }

      try {
        const response = await axios.get(`${api_url}/tasks/get_status?task_id=${taskId.value}`);
        console.log(response.data)
        if (response.data.data.studentAnswer === null) {
          ElMessage.error(
              {
                message: '暂时无学生作答',
                duration: flashDataTime
              }
          );
          return;
        }
        taskData.value = response.data.data;
        getEcharts()

      } catch
          (error) {
        ElMessage.error({
              message: error.response.data.msg,
              duration: flashDataTime
            }
        );
      }
    }
;

let intervalId: ReturnType<typeof setInterval>;

onMounted(async () => {
  await fetchStatusData();
  intervalId = setInterval(async () => {
    try {
      await fetchStatusData();
      // 更新图表数据
      getEcharts();
    } catch (error) {
      ElMessage.error({
          message: '获取最新数据时出错',
          duration: flashDataTime
      }
    );
      console.log('获取最新数据时出错:', error);
    }
  }, flashDataTime);

});

onUnmounted(() => {
  clearInterval(intervalId);
});

const xAxisData = computed(() => {
  if (!taskData.value || !taskData.value.correctAnswer) return [];
  return taskData.value.correctAnswer.map((item) => `第${taskData.value.correctAnswer.indexOf(item) + 1}题`);
});

interface DetailData {
  qaAnswersCount: Record<string, { correct: number; wrong: number }>;
  totalCorrectValue: number;
  totalCountValue: number;
}

const detailData = computed<DetailData>(() => {
  const result = taskDetailData(taskData.value);
  return {
    qaAnswersCount: result.qaAnswersCount,
    totalCorrectValue: result.totalCorrect,
    totalCountValue: result.totalCount,
  };
});

function getQaIdByOrder(order: number): string | undefined {
  return taskData.value.correctAnswer[order]?.qa_id;
}

function taskDetailData(taskData: TaskData) {
  if (!taskData || !taskData.correctAnswer) return {qaAnswersCount: {}, totalCorrect: 0, totalCount: 0};
  const qaAnswersCount: Record<string, { correct: number; wrong: number }> = {};
  let totalCorrect = 0;
  let totalCount = 0;


  taskData.correctAnswer.forEach((qa) => {
    qaAnswersCount[qa.qa_id] = {correct: 0, wrong: 0};
  });

  taskData.studentAnswer.forEach(({answers}) => {
    answers.forEach((answer) => {
      if (qaAnswersCount[answer.qa_id]) {
        if (answer.answer === taskData.correctAnswer.find((tQa) => tQa.qa_id === answer.qa_id)?.answer) {
          qaAnswersCount[answer.qa_id].correct++;
          totalCorrect++;
        } else {
          qaAnswersCount[answer.qa_id].wrong++;
        }
        totalCount++;
      }
    });
  });

  return {qaAnswersCount, totalCorrect, totalCount};
}


function getGradientColor(accuracy: number): string {
  // 定义红色和绿色的基础色值
  const redStart = [255, 0, 0];
  const greenEnd = [0, 255, 0];

  // 计算中间颜色（根据正确率比例）
  const ratio = accuracy / 100; // 将正确率转换为0-1之间的比例
  const gradientColor = redStart.map((colorValue, index) => Math.round(colorValue + (greenEnd[index] - colorValue) * ratio));

  return `rgb(${gradientColor[0]}, ${gradientColor[1]}, ${gradientColor[2]})`;
}

// 计算每道题目的正确率
const questionAccuracy = computed(() => {
  if (!taskData.value) return [];
  return xAxisData.value.map((_, index) => {
    const qaId = getQaIdByOrder(index);
    if (qaId && detailData.value.qaAnswersCount[qaId]) {
      const {correct, wrong} = detailData.value.qaAnswersCount[qaId];
      const totalCount = correct + wrong;
      // 添加条件判断，防止除以零
      return totalCount > 0 ? (correct / totalCount * 100).toFixed(2) : '无提交';
    }
    return '未统计';
  });
});

let userEc: any;

function getEcharts() {
  if (!taskData.value || !detailData.value) return;
  const infoEl = chartRef.value;
  if (!infoEl) {
    return
  }
  if (userEc != null && userEc != "" && userEc != undefined) {
    userEc.dispose();
  }
  userEc = echarts.init(infoEl, "light");

  const option: echarts.EChartsOption = {
    dataZoom: [
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
      },
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
    ],
    roam: true,
    tooltip: {
      show: true,
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function (params: any[]) {
        let res = params[0].name + '<br/>';
        params.forEach((item: any) => {
          if (item.seriesName === '正确人数') {
            const correctCount = item.data;
            const qaId = getQaIdByOrder(Number.parseInt(item.name.match(/\d+/)[0]) - 1);

            if (qaId && detailData.value.qaAnswersCount[qaId]) {
              const incorrectCount = detailData.value.qaAnswersCount[qaId].wrong;
              res += `${item.seriesName}: ${correctCount}人<br/>`;
              res += `错误人数: ${incorrectCount}人<br/>`;
            } else {
              res += `${item.seriesName}: ${correctCount}人<br/>`;
            }
          }
        });
        return res;
      },

    },
    xAxis: {
      type: 'category',
      data: xAxisData.value
    },
    yAxis: [{
      name: "人数",
      axisLine: {
        show: true
      },
      type: 'value',
      max: taskData.value.studentAnswer.length,
      axisLabel: {
        formatter: '{value}人'
      },
      interval: 1
    },
      {
        name: '正确率',
        type: 'value',
        axisLine: {
          show: true
        },
        position: 'right',
        axisLabel: {
          formatter: '{value}%',
        },
        min: 0,
        max: 100,
        interval: 10,
      }],
    series: [
      {
        name: '正确人数',
        type: 'bar',
        data: Object.values(detailData.value.qaAnswersCount).map(item => item.correct),
        itemStyle: {
          color: ({dataIndex}: { dataIndex: number }) => {
            const qaId = getQaIdByOrder(dataIndex);
            if (qaId && detailData.value.qaAnswersCount[qaId]) {
              const correctCount = detailData.value.qaAnswersCount[qaId].correct;
              const totalCount = correctCount + detailData.value.qaAnswersCount[qaId].wrong;
              const accuracy = totalCount > 0 ? (correctCount / totalCount * 100) : 0;
              return getGradientColor(accuracy);
            }
            return '#9e37ff'; // 默认颜色
          },
        },
        label: {
          show: true,
          formatter: '{c}人',
        },
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(180, 180, 180, 0.2)'
        }
      },
      {
        name: '正确率',
        type: 'line',
        smooth: true,
        data: questionAccuracy.value,
        yAxisIndex: 1,
        lineStyle: {
          color: "#4357ec",
          width: 3,
        },
        label: {
          show: true,
          position: 'top',
          formatter: function (params: any) {
            return `${params.data}%`;
          },
        },
        tooltip: {
          formatter: '{b}: {c}%'
        },
      }
    ]
  };

  userEc.setOption(option);
}

onMounted(() => {


  getEcharts()
  window.addEventListener('resize', () => {
    getEcharts();
  })
});

</script>
