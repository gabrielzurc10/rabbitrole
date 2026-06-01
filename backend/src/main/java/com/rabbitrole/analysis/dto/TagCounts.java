package com.rabbitrole.analysis.dto;

import java.util.List;

/** Tag totals per severity, for the score summary. */
public record TagCounts(int critical, int warning, int optional) {

    public static TagCounts from(List<Tag> tags) {
        int c = 0, w = 0, o = 0;
        for (Tag tag : tags) {
            switch (tag.severity()) {
                case CRITICAL -> c++;
                case WARNING -> w++;
                case OPTIONAL -> o++;
            }
        }
        return new TagCounts(c, w, o);
    }
}
