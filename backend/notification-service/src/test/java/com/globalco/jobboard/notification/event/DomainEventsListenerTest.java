package com.globalco.jobboard.notification.event;

import com.globalco.jobboard.common.event.Events;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DomainEventsListenerTest {

    @Test
    void jobRemovedGetsAnExplanation() {
        String msg = DomainEventsListener.statusMessage(
                new Events.ApplicationStatusChanged(1L, 7L, "Java Dev", "JOB_REMOVED"));
        assertThat(msg).contains("Java Dev").contains("removed").contains("closed");
    }

    @Test
    void otherStatusesArePrettified() {
        assertThat(DomainEventsListener.statusMessage(
                new Events.ApplicationStatusChanged(1L, 7L, "Java Dev", "INTERVIEW_SCHEDULED")))
                .isEqualTo("Your application for Java Dev is now interview scheduled.");
    }
}
