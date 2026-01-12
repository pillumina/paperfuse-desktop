//! Task queue for async paper processing
//!
//! Provides a channel-based queue with semaphore-based concurrency control
//! for processing multiple papers concurrently.

use crate::arxiv::ArxivEntry;
use std::sync::Arc;
use tokio::sync::{mpsc, Semaphore};

/// A queued task waiting to be processed
#[derive(Debug, Clone)]
pub struct QueuedTask {
    /// Index in the original entries list
    pub index: usize,
    /// The ArXiv entry to process
    pub entry: ArxivEntry,
}

/// Task queue for concurrent paper processing
pub struct TaskQueue {
    /// Channel sender for queueing tasks
    sender: mpsc::Sender<QueuedTask>,
    /// Channel receiver for processing tasks
    receiver: Arc<tokio::sync::Mutex<mpsc::Receiver<QueuedTask>>>,
    /// Semaphore for concurrency control
    semaphore: Arc<Semaphore>,
    /// Maximum queue size
    max_queue_size: usize,
}

impl Clone for TaskQueue {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
            receiver: Arc::clone(&self.receiver),
            semaphore: Arc::clone(&self.semaphore),
            max_queue_size: self.max_queue_size,
        }
    }
}

impl TaskQueue {
    /// Create a new task queue with the specified concurrency limit
    ///
    /// # Arguments
    /// * `max_concurrent` - Maximum number of concurrent processing tasks (1-5)
    /// * `max_queue_size` - Maximum number of tasks in the queue (default: 100)
    pub fn new(max_concurrent: usize, max_queue_size: usize) -> Self {
        let (sender, receiver) = mpsc::channel(max_queue_size);
        let semaphore = Arc::new(Semaphore::new(max_concurrent));

        Self {
            sender,
            receiver: Arc::new(tokio::sync::Mutex::new(receiver)),
            semaphore,
            max_queue_size,
        }
    }

    /// Queue a paper for processing
    ///
    /// Returns false if the queue is full
    pub async fn queue(&self, task: QueuedTask) -> Result<(), mpsc::error::SendError<QueuedTask>> {
        self.sender.send(task).await
    }

    /// Get the next task from the queue
    ///
    /// Uses a short timeout to avoid blocking when the queue is empty.
    /// If no task is available within 100ms, returns None (all tasks likely processed).
    pub async fn next_task(&self) -> Option<(QueuedTask, tokio::sync::SemaphorePermit<'_>)> {
        eprintln!("[TaskQueue::next_task] Waiting for task (with 100ms timeout)...");

        // Use a short timeout to detect when queue is empty
        // 100ms is short enough to be unnoticeable, long enough for race conditions
        let task = tokio::time::timeout(
            tokio::time::Duration::from_millis(100),
            async {
                let mut receiver = self.receiver.lock().await;
                receiver.recv().await
            }
        ).await;

        match task {
            Ok(Some(task)) => {
                eprintln!("[TaskQueue::next_task] Got task {}", task.index);
                // Acquire semaphore permit (this limits concurrency)
                let permit = self.semaphore.acquire().await.ok()?;
                eprintln!("[TaskQueue::next_task] Permit acquired for task {}", task.index);
                Some((task, permit))
            }
            Ok(None) => {
                eprintln!("[TaskQueue::next_task] Channel closed, returning None");
                None
            }
            Err(_) => {
                eprintln!("[TaskQueue::next_task] Timeout - queue likely empty, returning None");
                None
            }
        }
    }

    /// Get the current number of available permits (idle workers)
    pub async fn available_permits(&self) -> usize {
        self.semaphore.available_permits()
    }

    /// Close the queue, preventing new tasks from being queued
    pub async fn close(&self) {
        self.sender.closed().await;
    }

    /// Get the maximum queue size
    pub fn max_queue_size(&self) -> usize {
        self.max_queue_size
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_task_queue_basic() {
        let queue = TaskQueue::new(2, 10);

        // Queue some tasks
        for i in 0..3 {
            let task = QueuedTask {
                index: i,
                entry: ArxivEntry {
                    id: format!("id{}", i),
                    title: format!("Title {}", i),
                    summary: "Summary".to_string(),
                    published: chrono::Utc::now().to_rfc3339(),
                    categories: vec![],
                    authors: vec![],
                    links: vec![],
                },
            };

            queue.queue(task).await.unwrap();
        }

        // Process tasks
        let mut count = 0;
        while let Some((task, _permit)) = queue.next_task().await {
            assert_eq!(task.index, count);
            count += 1;
            if count >= 3 {
                break;
            }
        }

        assert_eq!(count, 3);
    }

    #[tokio::test]
    async fn test_concurrency_limit() {
        let queue = TaskQueue::new(2, 10);

        // Queue should allow 2 concurrent permits
        assert_eq!(queue.available_permits().await, 2);

        // Acquire first permit
        let _permit1 = queue.semaphore.acquire().await.unwrap();
        assert_eq!(queue.available_permits().await, 1);

        // Acquire second permit
        let _permit2 = queue.semaphore.acquire().await.unwrap();
        assert_eq!(queue.available_permits().await, 0);

        // Third permit should block until one is released
        let semaphore = queue.semaphore.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            drop(_permit1);
        });

        // This should eventually succeed
        let _permit3 = semaphore.acquire().await.unwrap();
        assert_eq!(queue.available_permits().await, 0);
    }
}
